import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import SiweService from '#services/siwe_service'
import redis from '@adonisjs/redis/services/main'
import { getNonceValidator, verifySignatureValidator } from '#validators/auth'
import { JWT_ACCESS_TOKEN_EXPIRY_SECONDS } from '#config/auth'

const TOKEN_BLACKLIST_PREFIX = 'token:blacklist:'

export default class AuthController {
  /**
   * GET /auth/nonce
   * Generate a SIWE nonce for authentication
   */
  async getNonce({ request, response }: HttpContext) {
    const { walletAddress, chainId } = await getNonceValidator.validate(request.qs())

    const result = await SiweService.generateNonce(walletAddress, chainId)

    return response.ok({
      nonce: result.nonce,
      chainId: result.chainId,
    })
  }

  /**
   * POST /auth/verify
   * Verify SIWE signature and return JWT tokens (access + refresh)
   */
  async verify({ request, response, auth }: HttpContext) {
    const { message, signature } = await verifySignatureValidator.validate(request.body())

    // Verify the SIWE signature
    let walletAddress: string
    try {
      walletAddress = await SiweService.verify(message, signature)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed'
      // Map SIWE errors to appropriate HTTP status codes
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        return response.badRequest({ error: errorMessage })
      }
      return response.unauthorized({ error: errorMessage })
    }

    // Find or create user
    let user = await User.findBy('walletAddress', walletAddress.toLowerCase())

    if (!user) {
      user = await User.create({
        walletAddress: walletAddress.toLowerCase(),
      })
    }

    // Generate JWT access token
    const accessToken = await auth.use('jwt').generate(user)

    // Generate refresh token (stored in database)
    const refreshToken = await User.refreshTokens.create(user)

    return response.ok({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        createdAt: user.createdAt,
      },
      accessToken: (accessToken as { token: string }).token,
      refreshToken: refreshToken.value!.release(),
    })
  }

  /**
   * POST /auth/refresh
   * Exchange refresh token for new access token
   * Expects: Authorization: Bearer <refresh_token>
   */
  async refresh({ response, auth }: HttpContext) {
    try {
      // authenticateWithRefreshToken reads from Authorization header
      const user = await auth.use('jwt').authenticateWithRefreshToken()

      // Generate new access token
      const accessToken = await auth.use('jwt').generate(user)

      // The method rotates the refresh token and stores it on user.currentToken
      const newRefreshToken = user.currentToken

      return response.ok({
        accessToken: (accessToken as { token: string }).token,
        refreshToken: newRefreshToken,
      })
    } catch {
      return response.unauthorized({ error: 'Invalid or expired refresh token' })
    }
  }

  /**
   * POST /auth/logout
   * Logout, blacklist access token, and revoke refresh tokens
   */
  async logout({ auth, request, response }: HttpContext) {
    const user = auth.user!

    // Blacklist the current access token
    const authHeader = request.header('authorization')
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7)
      await redis.setex(`${TOKEN_BLACKLIST_PREFIX}${token}`, JWT_ACCESS_TOKEN_EXPIRY_SECONDS, '1')
    }

    // Delete all refresh tokens for this user
    const tokens = await User.refreshTokens.all(user)
    for (const token of tokens) {
      await User.refreshTokens.delete(user, token.identifier)
    }

    return response.ok({
      message: 'Logged out successfully',
    })
  }

  /**
   * Check if a token is blacklisted
   */
  static async isTokenBlacklisted(token: string): Promise<boolean> {
    const blacklisted = await redis.get(`${TOKEN_BLACKLIST_PREFIX}${token}`)
    return blacklisted !== null
  }
}
