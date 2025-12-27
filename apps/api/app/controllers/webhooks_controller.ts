import type { HttpContext } from '@adonisjs/core/http'
import Receipt from '#models/receipt'
import Port from '#models/port'
import { alchemyWebhookValidator, manualAnnouncementValidator } from '#validators/webhook'

// ERC-5564 Announcement event topic
const ANNOUNCEMENT_TOPIC = '0x5f0eab8057630ba7676c49b4f21a0231414e79474595be8e4c432fbf6bf0f4e7'

export default class WebhooksController {
  /**
   * POST /webhooks/alchemy
   * Handle Alchemy webhook for ERC-5564 Announcement events
   */
  async alchemy({ request, response }: HttpContext) {
    const payload = await alchemyWebhookValidator.validate(request.body())

    const processed: string[] = []
    const errors: string[] = []

    for (const activity of payload.event.activity) {
      // Skip if no log data (not a contract event)
      if (!activity.log) continue

      // Check if this is an Announcement event
      const topics = activity.log.topics
      if (topics.length < 1 || topics[0] !== ANNOUNCEMENT_TOPIC) continue

      try {
        await this.processAnnouncement({
          txHash: activity.hash,
          blockNumber: Number.parseInt(activity.log.blockNumber, 16),
          logData: activity.log.data,
          topics: topics,
        })
        processed.push(activity.hash)
      } catch (error) {
        errors.push(`${activity.hash}: ${(error as Error).message}`)
      }
    }

    return response.ok({
      processed: processed.length,
      errors: errors.length > 0 ? errors : undefined,
    })
  }

  /**
   * POST /webhooks/manual
   * Manually submit an announcement (for testing/recovery)
   */
  async manual({ request, response }: HttpContext) {
    const data = await manualAnnouncementValidator.validate(request.body())

    // Check if receipt already exists
    const existing = await Receipt.findBy('txHash', data.txHash)
    if (existing) {
      return response.conflict({
        error: 'Receipt already exists for this transaction',
        receiptId: existing.id,
      })
    }

    // Find matching port by stealth address
    const port = await Port.query()
      .where('stealthMetaAddress', 'like', `%${data.stealthAddress.slice(2).toLowerCase()}%`)
      .first()

    if (!port) {
      return response.notFound({
        error: 'No matching port found for this stealth address',
      })
    }

    // Create receipt
    const receipt = await Receipt.create({
      portId: port.id,
      stealthAddress: data.stealthAddress.toLowerCase(),
      ephemeralPubKey: data.ephemeralPubKey,
      viewTag: data.viewTag,
      amount: data.amount,
      currency: data.tokenAddress ? 'ERC20' : 'MNT',
      tokenAddress: data.tokenAddress?.toLowerCase() || null,
      status: 'pending',
      blockNumber: data.blockNumber.toString(),
      txHash: data.txHash,
    })

    return response.created({
      id: receipt.id,
      portId: receipt.portId,
      status: receipt.status,
      message: 'Receipt created, awaiting confirmation',
    })
  }

  /**
   * Process a single announcement event
   */
  private async processAnnouncement(params: {
    txHash: string
    blockNumber: number
    logData: string
    topics: string[]
  }): Promise<void> {
    // Parse ERC-5564 Announcement event data
    // Event: Announcement(uint256 schemeId, address stealthAddress, address caller, bytes ephemeralPubKey, bytes metadata)
    // Topics: [eventSig, schemeId, stealthAddress, caller]
    // Data: ephemeralPubKey, metadata

    if (params.topics.length < 4) {
      throw new Error('Invalid announcement event: missing topics')
    }

    const stealthAddress = '0x' + params.topics[2].slice(26)
    const data = params.logData.slice(2) // Remove 0x prefix

    // Parse ephemeral public key (first 32 bytes offset, then length, then data)
    // ABI encoding: offset (32) + offset (32) + ephemPubKey length (32) + ephemPubKey data
    const ephemPubKeyOffset = Number.parseInt(data.slice(0, 64), 16) * 2
    const ephemPubKeyLength = Number.parseInt(
      data.slice(ephemPubKeyOffset, ephemPubKeyOffset + 64),
      16
    )
    const ephemeralPubKey =
      '0x' + data.slice(ephemPubKeyOffset + 64, ephemPubKeyOffset + 64 + ephemPubKeyLength * 2)

    // Parse metadata to get view tag (first byte of metadata)
    const metadataOffset = Number.parseInt(data.slice(64, 128), 16) * 2
    const metadataLength = Number.parseInt(data.slice(metadataOffset, metadataOffset + 64), 16)
    const metadata = data.slice(metadataOffset + 64, metadataOffset + 64 + metadataLength * 2)
    const viewTag = metadata.length >= 2 ? Number.parseInt(metadata.slice(0, 2), 16) : 0

    // Check if receipt already exists
    const existing = await Receipt.findBy('txHash', params.txHash)
    if (existing) {
      return // Already processed
    }

    // Find matching port (we'll need to scan all ports and check)
    // For now, create a pending receipt that will be matched during scan
    const receipt = await Receipt.create({
      portId: null as unknown as string, // Will be matched by scan job
      stealthAddress: stealthAddress.toLowerCase(),
      ephemeralPubKey: ephemeralPubKey,
      viewTag: viewTag,
      amount: '0', // Will be filled by balance check
      currency: 'MNT',
      tokenAddress: null,
      status: 'pending',
      blockNumber: params.blockNumber.toString(),
      txHash: params.txHash,
    })

    console.log(`Created pending receipt ${receipt.id} for stealth address ${stealthAddress}`)
  }
}
