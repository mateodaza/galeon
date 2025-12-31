import { test } from '@japa/runner'
import { SiweMessage } from 'siwe'
import { Wallet } from 'ethers'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import User from '#models/user'

// Test wallet (Hardhat's first test account)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const testWallet = new Wallet(TEST_PRIVATE_KEY)
const TEST_WALLET_ADDRESS = testWallet.address

test.group('AuthController', (group) => {
  // Wrap each test in a transaction for isolation
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return async () => {
      await db.rollbackGlobalTransaction()
    }
  })

  // Clean up Redis after each test
  group.each.teardown(async () => {
    const nonceKeys = await redis.keys('siwe:nonce:*')
    const blacklistKeys = await redis.keys('token:blacklist:*')
    const allKeys = [...nonceKeys, ...blacklistKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
  })

  test('GET /api/v1/auth/nonce returns nonce and chainId', async ({ client, assert }) => {
    const response = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    response.assertStatus(200)
    assert.exists(response.body().nonce)
    assert.exists(response.body().chainId)
  })

  test('GET /api/v1/auth/nonce requires valid wallet address', async ({ client }) => {
    const response = await client.get('/api/v1/auth/nonce').qs({ walletAddress: 'invalid' })

    response.assertStatus(422)
  })

  test('GET /api/v1/auth/nonce accepts optional chainId', async ({ client, assert }) => {
    const response = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS, chainId: 5003 })

    response.assertStatus(200)
    assert.equal(response.body().chainId, 5003)
  })

  test('POST /api/v1/auth/verify creates new user and returns JWT', async ({ client, assert }) => {
    // Get nonce
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    // Verify
    const response = await client.post('/api/v1/auth/verify').json({ message, signature })

    response.assertStatus(200)
    assert.exists(response.body().accessToken)
    assert.exists(response.body().refreshToken)
    assert.exists(response.body().user)
    assert.equal(response.body().user.walletAddress, TEST_WALLET_ADDRESS.toLowerCase())

    // Verify user was created
    const user = await User.findBy('walletAddress', TEST_WALLET_ADDRESS.toLowerCase())
    assert.isNotNull(user)
  })

  test('POST /api/v1/auth/verify returns existing user', async ({ client, assert }) => {
    // Create user first
    const existingUser = await User.create({
      walletAddress: TEST_WALLET_ADDRESS.toLowerCase(),
    })

    // Get nonce
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    // Verify
    const response = await client.post('/api/v1/auth/verify').json({ message, signature })

    response.assertStatus(200)
    assert.equal(response.body().user.id, existingUser.id)
  })

  test('POST /api/v1/auth/verify rejects invalid signature', async ({ client }) => {
    // Get nonce
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()

    // Sign with wrong wallet
    const wrongWallet = Wallet.createRandom()
    const signature = await wrongWallet.signMessage(message)

    // Verify should fail with 401 (unauthorized - signature mismatch)
    const response = await client.post('/api/v1/auth/verify').json({ message, signature })

    response.assertStatus(401)
  })

  test('POST /api/v1/auth/verify rejects expired nonce', async ({ client }) => {
    // Get nonce
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    // Delete nonce from Redis to simulate expiration
    await redis.del(`siwe:nonce:${nonce}`)

    // Create SIWE message
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    // Verify should fail with 400 (bad request - expired/invalid nonce)
    const response = await client.post('/api/v1/auth/verify').json({ message, signature })

    response.assertStatus(400)
  })

  test('POST /api/v1/auth/refresh exchanges refresh token for new tokens', async ({
    client,
    assert,
  }) => {
    // First authenticate to get tokens
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
    const { refreshToken } = authResponse.body()

    // Use refresh token to get new access token (via Authorization header)
    const refreshResponse = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', `Bearer ${refreshToken}`)

    refreshResponse.assertStatus(200)
    assert.exists(refreshResponse.body().accessToken)
    assert.exists(refreshResponse.body().refreshToken)
  })

  test('POST /api/v1/auth/refresh rejects invalid token', async ({ client }) => {
    const response = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', 'Bearer invalid_refresh_token_here')

    response.assertStatus(401)
    response.assertBodyContains({ error: 'Invalid or expired refresh token' })
  })

  test('POST /api/v1/auth/refresh rejects missing Authorization header', async ({ client }) => {
    const response = await client.post('/api/v1/auth/refresh')

    response.assertStatus(401)
  })

  test('POST /api/v1/auth/refresh rejects malformed Authorization header', async ({ client }) => {
    // Missing "Bearer " prefix
    const response = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', 'some_token_without_bearer_prefix')

    response.assertStatus(401)
  })

  test('POST /api/v1/auth/refresh rejects already-rotated token', async ({ client, assert }) => {
    // First authenticate to get tokens
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
    const { refreshToken: originalRefreshToken } = authResponse.body()

    // Use the refresh token once - this rotates it and invalidates the original
    const firstRefresh = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', `Bearer ${originalRefreshToken}`)

    firstRefresh.assertStatus(200)
    assert.exists(firstRefresh.body().refreshToken)

    // Try to use the OLD (now-rotated) token again - should fail
    const secondRefresh = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', `Bearer ${originalRefreshToken}`)

    secondRefresh.assertStatus(401)
    secondRefresh.assertBodyContains({ error: 'Invalid or expired refresh token' })
  })

  test('POST /api/v1/auth/refresh with rotated token returns new tokens that work', async ({
    client,
    assert,
  }) => {
    // Authenticate
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
    const { refreshToken: firstToken } = authResponse.body()

    // First refresh - get new tokens
    const firstRefresh = await client
      .post('/api/v1/auth/refresh')
      .header('Authorization', `Bearer ${firstToken}`)

    firstRefresh.assertStatus(200)
    const { refreshToken: secondToken, accessToken } = firstRefresh.body()

    // Verify the new access token works for authenticated routes
    const protectedResponse = await client
      .post('/api/v1/auth/logout')
      .header('Authorization', `Bearer ${accessToken}`)

    protectedResponse.assertStatus(200)

    // Note: After logout, refresh tokens are deleted, so we can't test further refresh
    // But we've verified the rotated tokens work correctly
    assert.notEqual(firstToken, secondToken, 'Refresh token should be rotated')
  })

  test('POST /api/v1/auth/logout requires authentication', async ({ client }) => {
    const response = await client.post('/api/v1/auth/logout')

    response.assertStatus(401)
  })

  test('POST /api/v1/auth/logout blacklists token', async ({ client, assert }) => {
    // First authenticate
    const nonceResponse = await client
      .get('/api/v1/auth/nonce')
      .qs({ walletAddress: TEST_WALLET_ADDRESS })

    const { nonce, chainId } = nonceResponse.body()

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
    const accessToken = authResponse.body().accessToken

    // Logout
    const logoutResponse = await client
      .post('/api/v1/auth/logout')
      .header('Authorization', `Bearer ${accessToken}`)

    logoutResponse.assertStatus(200)
    assert.equal(logoutResponse.body().message, 'Logged out successfully')

    // Verify token is blacklisted in Redis
    const blacklisted = await redis.get(`token:blacklist:${accessToken}`)
    assert.isNotNull(blacklisted)
  })
})
