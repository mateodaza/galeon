import { SiweMessage, generateNonce } from 'siwe'
import redis from '@adonisjs/redis/services/main'
import ChainService from '#services/chain_service'

const NONCE_TTL = 300 // 5 minutes

export default class SiweService {
  /**
   * Generate a SIWE nonce for authentication
   * Nonce is stored in Redis with the wallet address for validation
   *
   * @param walletAddress - The wallet address requesting auth
   * @param chainId - Optional chain ID (defaults to env CHAIN_ID)
   * @returns Nonce and chain ID
   */
  static async generateNonce(
    walletAddress: string,
    chainId?: number
  ): Promise<{ nonce: string; chainId: number }> {
    const nonce = generateNonce()

    // Use provided chainId or default from env
    const selectedChainId = chainId ?? ChainService.getDefaultChainId()

    // Validate chain is allowed
    if (!ChainService.isAllowedChain(selectedChainId)) {
      throw new Error(
        `Chain ${selectedChainId} is not allowed. Allowed chains: ${ChainService.getAllowedChainIds().join(', ')}`
      )
    }

    // Store nonce in Redis with wallet address AND chain ID for validation
    const nonceData = JSON.stringify({
      walletAddress: walletAddress.toLowerCase(),
      chainId: selectedChainId,
      createdAt: Date.now(),
    })
    await redis.setex(`siwe:nonce:${nonce}`, NONCE_TTL, nonceData)

    return {
      nonce,
      chainId: selectedChainId,
    }
  }

  /**
   * Verify a SIWE signature
   *
   * @param message - The SIWE message that was signed
   * @param signature - The signature from the wallet
   * @returns The verified wallet address
   */
  static async verify(message: string, signature: string): Promise<string> {
    const siweMessage = new SiweMessage(message)

    // 1. Retrieve and validate nonce from Redis
    const nonceDataRaw = await redis.get(`siwe:nonce:${siweMessage.nonce}`)
    if (!nonceDataRaw) {
      throw new Error('Invalid or expired nonce')
    }

    const nonceData = JSON.parse(nonceDataRaw) as {
      walletAddress: string
      chainId: number
      createdAt: number
    }

    // 2. Validate wallet address matches nonce request
    if (nonceData.walletAddress !== siweMessage.address.toLowerCase()) {
      throw new Error('Nonce address mismatch')
    }

    // 3. Validate chain ID matches nonce request
    if (nonceData.chainId !== siweMessage.chainId) {
      throw new Error(
        `Chain ID mismatch. Expected ${nonceData.chainId}, got ${siweMessage.chainId}`
      )
    }

    // 4. Validate chain ID is allowed
    if (!ChainService.isAllowedChain(siweMessage.chainId)) {
      throw new Error(`Chain ${siweMessage.chainId} is not allowed`)
    }

    // 5. Verify the signature cryptographically
    let result
    try {
      result = await siweMessage.verify({ signature })
    } catch (verifyError: unknown) {
      // SIWE may reject with an object instead of Error
      const errorType =
        verifyError && typeof verifyError === 'object' && 'error' in verifyError
          ? (verifyError as { error?: { type?: string } }).error?.type
          : 'Unknown error'
      throw new Error(`Signature verification failed: ${errorType}`)
    }

    if (!result.success) {
      throw new Error(`Signature verification failed: ${result.error?.type || 'Unknown error'}`)
    }

    // 6. Delete nonce (one-time use, prevents replay)
    await redis.del(`siwe:nonce:${siweMessage.nonce}`)

    return siweMessage.address
  }
}
