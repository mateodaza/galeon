import type Port from '#models/port'
import Receipt from '#models/receipt'
import Collection from '#models/collection'
import StealthService, { type ClaimablePayment } from '#services/stealth_service'
import RelayerService from '#services/relayer_service'

export interface CollectionResult {
  success: boolean
  txHash?: string
  error?: string
}

export default class CollectionService {
  /**
   * Scan multiple ports for claimable payments
   *
   * @param ports - Ports to scan
   * @returns Array of all claimable payments across ports
   */
  static async scanForClaimable(ports: Port[]): Promise<ClaimablePayment[]> {
    const allClaimable: ClaimablePayment[] = []

    for (const port of ports) {
      // Get uncollected receipts for this port
      const receipts = await Receipt.query().where('portId', port.id).where('status', 'confirmed')

      // TODO: Implement port scanning with stealth library
      // This requires decrypting viewing key and scanning announcements
      // For now, return receipts as claimable (only if they have required fields)
      for (const receipt of receipts) {
        // Skip receipts missing required fields (verification incomplete)
        if (
          !receipt.stealthAddress ||
          !receipt.ephemeralPubKey ||
          receipt.viewTag === null ||
          !receipt.amount ||
          !receipt.currency
        ) {
          continue
        }

        allClaimable.push({
          receiptId: receipt.id,
          portId: port.id,
          stealthAddress: receipt.stealthAddress,
          ephemeralPubKey: receipt.ephemeralPubKey,
          viewTag: receipt.viewTag,
          amount: receipt.amount,
          currency: receipt.currency,
          tokenAddress: receipt.tokenAddress,
          stealthPrivateKey: new Uint8Array(32), // Placeholder - needs proper derivation
        })
      }
    }

    return allClaimable
  }

  /**
   * Execute collection for a set of receipts
   *
   * @param collection - The collection record to process
   * @param receiptIds - Receipt IDs to collect
   * @param recipientWallet - Destination wallet address
   * @param spendingSignature - Signature proving ownership of spending key
   */
  static async executeCollection(
    collection: Collection,
    receiptIds: string[],
    recipientWallet: string,
    _spendingSignature: string
  ): Promise<CollectionResult> {
    try {
      // Update collection status to processing
      collection.status = 'processing'
      await collection.save()

      // Get receipts with their ports
      const receipts = await Receipt.query().whereIn('id', receiptIds).preload('port')

      if (receipts.length === 0) {
        throw new Error('No receipts found')
      }

      // Group receipts by token for batched transfers
      const nativeReceipts: Receipt[] = []
      const tokenReceipts: Map<string, Receipt[]> = new Map()

      for (const receipt of receipts) {
        if (receipt.tokenAddress) {
          const existing = tokenReceipts.get(receipt.tokenAddress) || []
          existing.push(receipt)
          tokenReceipts.set(receipt.tokenAddress, existing)
        } else {
          nativeReceipts.push(receipt)
        }
      }

      // Process each receipt
      let processedCount = 0
      let totalNativeAmount = BigInt(0)
      const tokenAmounts: Record<string, string> = {}

      // Process native token receipts
      for (const receipt of nativeReceipts) {
        try {
          // Skip ports without viewing keys (two-step creation incomplete)
          if (!receipt.port.viewingKeyEncrypted) {
            console.warn(
              `Port ${receipt.port.id} has no viewing key, skipping receipt ${receipt.id}`
            )
            continue
          }

          // Skip receipts missing required fields
          if (!receipt.ephemeralPubKey || !receipt.amount) {
            console.warn(`Receipt ${receipt.id} missing required fields, skipping`)
            continue
          }

          // TODO: Derive stealth private key properly using stealth library
          // This requires: ephemeralPubKey, spendingPrivateKey, viewingPrivateKey
          const ephemeralPubKeyBytes = StealthService.hexToBytes(receipt.ephemeralPubKey)
          const viewingKeyBytes = StealthService.hexToBytes(receipt.port.viewingKeyEncrypted)
          // Placeholder spending key - in production this comes from user's wallet signature
          const spendingKeyBytes = new Uint8Array(32)

          const { stealthPrivateKey } = StealthService.deriveStealthPrivateKey(
            ephemeralPubKeyBytes,
            spendingKeyBytes,
            viewingKeyBytes
          )

          // Send funds from stealth address to recipient
          await RelayerService.sendFromStealth(
            stealthPrivateKey,
            recipientWallet,
            BigInt(receipt.amount)
          )

          // Update receipt status
          receipt.status = 'collected'
          receipt.collectionId = collection.id
          await receipt.save()

          // Update port stats
          receipt.port.totalCollected = (
            BigInt(receipt.port.totalCollected) + BigInt(receipt.amount)
          ).toString()
          await receipt.port.save()

          totalNativeAmount += BigInt(receipt.amount)
          processedCount++

          // Update collection progress
          collection.processedReceipts = processedCount
          await collection.save()
        } catch (error) {
          console.error(`Failed to collect receipt ${receipt.id}:`, error)
          // Continue with other receipts
        }
      }

      // Process ERC20 token receipts
      for (const [tokenAddress, tokenReceiptList] of tokenReceipts) {
        let tokenTotal = BigInt(0)

        for (const receipt of tokenReceiptList) {
          try {
            // Skip ports without viewing keys (two-step creation incomplete)
            if (!receipt.port.viewingKeyEncrypted) {
              console.warn(
                `Port ${receipt.port.id} has no viewing key, skipping receipt ${receipt.id}`
              )
              continue
            }

            // Skip receipts missing required fields
            if (!receipt.ephemeralPubKey || !receipt.amount) {
              console.warn(`Receipt ${receipt.id} missing required fields, skipping`)
              continue
            }

            const ephemeralPubKeyBytes = StealthService.hexToBytes(receipt.ephemeralPubKey)
            const viewingKeyBytes = StealthService.hexToBytes(receipt.port.viewingKeyEncrypted)
            const spendingKeyBytes = new Uint8Array(32)

            const { stealthPrivateKey } = StealthService.deriveStealthPrivateKey(
              ephemeralPubKeyBytes,
              spendingKeyBytes,
              viewingKeyBytes
            )

            await RelayerService.sendTokenFromStealth(
              stealthPrivateKey,
              tokenAddress,
              recipientWallet,
              BigInt(receipt.amount)
            )

            receipt.status = 'collected'
            receipt.collectionId = collection.id
            await receipt.save()

            receipt.port.totalCollected = (
              BigInt(receipt.port.totalCollected) + BigInt(receipt.amount)
            ).toString()
            await receipt.port.save()

            tokenTotal += BigInt(receipt.amount)
            processedCount++

            collection.processedReceipts = processedCount
            await collection.save()
          } catch (error) {
            console.error(`Failed to collect token receipt ${receipt.id}:`, error)
          }
        }

        if (tokenTotal > 0) {
          tokenAmounts[tokenAddress] = tokenTotal.toString()
        }
      }

      // Finalize collection
      collection.status = processedCount > 0 ? 'completed' : 'failed'
      collection.totalAmount = totalNativeAmount.toString()
      collection.tokenAmounts = tokenAmounts
      collection.processedReceipts = processedCount

      if (processedCount === 0) {
        collection.errorMessage = 'Failed to collect any receipts'
      }

      await collection.save()

      return {
        success: processedCount > 0,
        error: processedCount === 0 ? 'Failed to collect any receipts' : undefined,
      }
    } catch (error) {
      collection.status = 'failed'
      collection.errorMessage = (error as Error).message
      await collection.save()

      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  /**
   * Get collection statistics for a user
   */
  static async getUserStats(userId: number): Promise<{
    totalCollections: number
    completedCollections: number
    totalCollected: string
  }> {
    const collections = await Collection.query().where('userId', userId)

    let totalCollected = BigInt(0)
    let completedCount = 0

    for (const collection of collections) {
      if (collection.status === 'completed') {
        completedCount++
        totalCollected += BigInt(collection.totalAmount)
      }
    }

    return {
      totalCollections: collections.length,
      completedCollections: completedCount,
      totalCollected: totalCollected.toString(),
    }
  }
}
