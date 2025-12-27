import { test } from '@japa/runner'
import { SiweMessage } from 'siwe'
import { Wallet } from 'ethers'
import redis from '@adonisjs/redis/services/main'
import SiweService from '#services/siwe_service'
import ChainService from '#services/chain_service'

// Test wallet for signing (Hardhat's first test account)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const testWallet = new Wallet(TEST_PRIVATE_KEY)
const TEST_WALLET_ADDRESS = testWallet.address

test.group('SiweService', (group) => {
  // Clean up Redis after each test
  group.each.teardown(async () => {
    const keys = await redis.keys('siwe:nonce:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  })

  test('generateNonce returns nonce and chainId', async ({ assert }) => {
    const result = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    assert.exists(result.nonce)
    assert.isString(result.nonce)
    assert.exists(result.chainId)
    assert.equal(result.chainId, ChainService.getDefaultChainId())
  })

  test('generateNonce stores nonce data in Redis', async ({ assert }) => {
    const result = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    const storedData = await redis.get(`siwe:nonce:${result.nonce}`)
    assert.isNotNull(storedData)

    const parsed = JSON.parse(storedData!)
    assert.equal(parsed.walletAddress, TEST_WALLET_ADDRESS.toLowerCase())
    assert.equal(parsed.chainId, result.chainId)
    assert.exists(parsed.createdAt)
  })

  test('generateNonce uses provided chainId', async ({ assert }) => {
    const result = await SiweService.generateNonce(TEST_WALLET_ADDRESS, 5000)

    assert.equal(result.chainId, 5000)

    const storedData = await redis.get(`siwe:nonce:${result.nonce}`)
    const parsed = JSON.parse(storedData!)
    assert.equal(parsed.chainId, 5000)
  })

  test('generateNonce throws for disallowed chain', async ({ assert }) => {
    await assert.rejects(
      () => SiweService.generateNonce(TEST_WALLET_ADDRESS, 1),
      /Chain 1 is not allowed/
    )
  })

  test('generateNonce generates unique nonces', async ({ assert }) => {
    const result1 = await SiweService.generateNonce(TEST_WALLET_ADDRESS)
    const result2 = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    assert.notEqual(result1.nonce, result2.nonce)
  })

  test('verify validates signature and returns wallet address', async ({ assert }) => {
    // Generate nonce
    const { nonce, chainId } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

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

    // Sign the message using ethers.js Wallet
    const signature = await testWallet.signMessage(message)

    // Verify
    const verifiedAddress = await SiweService.verify(message, signature)

    assert.equal(verifiedAddress.toLowerCase(), TEST_WALLET_ADDRESS.toLowerCase())
  })

  test('verify deletes nonce after successful verification (prevents replay)', async ({
    assert,
  }) => {
    const { nonce, chainId } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

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

    await SiweService.verify(message, signature)

    // Nonce should be deleted
    const storedNonce = await redis.get(`siwe:nonce:${nonce}`)
    assert.isNull(storedNonce)
  })

  test('verify throws for invalid nonce', async ({ assert }) => {
    // First generate a valid nonce to get a properly formatted one
    const { nonce: validNonce, chainId } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    // Delete the nonce from Redis to simulate expiration
    await redis.del(`siwe:nonce:${validNonce}`)

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce: validNonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    await assert.rejects(() => SiweService.verify(message, signature), /Invalid or expired nonce/)
  })

  test('verify throws for address mismatch', async ({ assert }) => {
    const { nonce, chainId } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    // Create message with different address
    const differentAddress = '0x1111111111111111111111111111111111111111'
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: differentAddress,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    await assert.rejects(() => SiweService.verify(message, signature), /Nonce address mismatch/)
  })

  test('verify throws for chainId mismatch', async ({ assert }) => {
    const { nonce } = await SiweService.generateNonce(TEST_WALLET_ADDRESS, 5003)

    // Create message with different chainId
    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId: 5000, // Different from nonce request
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    await assert.rejects(() => SiweService.verify(message, signature), /Chain ID mismatch/)
  })

  test('verify throws for invalid signature', async ({ assert }) => {
    const { nonce, chainId } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

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

    // Sign with a different wallet (wrong signer)
    const wrongWallet = Wallet.createRandom()
    const wrongSignature = await wrongWallet.signMessage(message)

    try {
      await SiweService.verify(message, wrongSignature)
      assert.fail('Expected verify to throw an error')
    } catch (error) {
      assert.instanceOf(error, Error)
      assert.match((error as Error).message, /Signature verification failed/)
    }
  })

  test('verify throws for disallowed chainId in message', async ({ assert }) => {
    // Create nonce for allowed chain
    const { nonce } = await SiweService.generateNonce(TEST_WALLET_ADDRESS, 5003)

    // Manually modify Redis to have a disallowed chainId
    const nonceData = JSON.stringify({
      walletAddress: TEST_WALLET_ADDRESS.toLowerCase(),
      chainId: 1, // Disallowed chain
      createdAt: Date.now(),
    })
    await redis.setex(`siwe:nonce:${nonce}`, 300, nonceData)

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: TEST_WALLET_ADDRESS,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId: 1,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await testWallet.signMessage(message)

    await assert.rejects(() => SiweService.verify(message, signature), /Chain 1 is not allowed/)
  })

  test('nonce expires after TTL', async ({ assert }) => {
    // This test verifies the TTL is set (we can't easily test actual expiration)
    const { nonce } = await SiweService.generateNonce(TEST_WALLET_ADDRESS)

    const ttl = await redis.ttl(`siwe:nonce:${nonce}`)

    // TTL should be set (around 300 seconds)
    assert.isAbove(ttl, 0)
    assert.isAtMost(ttl, 300)
  })

  test('verify works with different wallet addresses', async ({ assert }) => {
    // Create a second test wallet
    const secondWallet = Wallet.createRandom()
    const secondAddress = secondWallet.address

    const { nonce, chainId } = await SiweService.generateNonce(secondAddress)

    const siweMessage = new SiweMessage({
      domain: 'localhost',
      address: secondAddress,
      statement: 'Sign in to Galeon',
      uri: 'http://localhost:3333',
      version: '1',
      chainId,
      nonce,
      issuedAt: new Date().toISOString(),
    })

    const message = siweMessage.prepareMessage()
    const signature = await secondWallet.signMessage(message)

    const verifiedAddress = await SiweService.verify(message, signature)

    assert.equal(verifiedAddress.toLowerCase(), secondAddress.toLowerCase())
  })
})
