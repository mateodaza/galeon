import { test } from '@japa/runner'
import type { ApiClient } from '@japa/api-client'
import { SiweMessage } from 'siwe'
import { Wallet } from 'ethers'
import db from '@adonisjs/lucid/services/db'
import redis from '@adonisjs/redis/services/main'
import type User from '#models/user'
import Port from '#models/port'

// Test wallet (Hardhat's first test account)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'
const testWallet = new Wallet(TEST_PRIVATE_KEY)
const TEST_WALLET_ADDRESS = testWallet.address

// Second test wallet for isolation tests
const TEST_PRIVATE_KEY_2 = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'
const testWallet2 = new Wallet(TEST_PRIVATE_KEY_2)
const TEST_WALLET_ADDRESS_2 = testWallet2.address

// Valid test data
const validStealthMetaAddress = 'st:mnt:0x' + 'a'.repeat(132)
const validViewingKey = '0x' + 'b'.repeat(64)

// Helper to create port with all required fields
async function createTestPort(
  userId: number,
  overrides: Partial<{
    name: string
    stealthMetaAddress: string | null
    viewingKeyEncrypted: string | null
    archived: boolean
    type: 'permanent' | 'recurring' | 'one-time' | 'burner'
    status: 'pending' | 'confirmed'
    chainId: number
  }> = {}
) {
  return Port.create({
    userId,
    name: overrides.name ?? 'Test Port',
    type: overrides.type ?? 'permanent',
    stealthMetaAddress: overrides.stealthMetaAddress ?? validStealthMetaAddress,
    viewingKeyEncrypted: overrides.viewingKeyEncrypted ?? Port.encryptViewingKey(validViewingKey),
    archived: overrides.archived ?? false,
    status: overrides.status ?? 'confirmed',
    chainId: overrides.chainId ?? 5000,
  })
}

async function authenticateUser(
  client: ApiClient,
  wallet: Wallet = testWallet,
  walletAddress: string = TEST_WALLET_ADDRESS
): Promise<{ accessToken: string; user: User }> {
  const nonceResponse = await client.get('/api/v1/auth/nonce').qs({ walletAddress })
  const { nonce, chainId } = nonceResponse.body()

  const siweMessage = new SiweMessage({
    domain: 'localhost',
    address: walletAddress,
    statement: 'Sign in to Galeon',
    uri: 'http://localhost:3333',
    version: '1',
    chainId,
    nonce,
    issuedAt: new Date().toISOString(),
  })

  const message = siweMessage.prepareMessage()
  const signature = await wallet.signMessage(message)

  const authResponse = await client.post('/api/v1/auth/verify').json({ message, signature })
  const { accessToken, user } = authResponse.body()

  return { accessToken, user }
}

test.group('PortsController', (group) => {
  group.each.setup(async () => {
    await db.beginGlobalTransaction()
    return async () => {
      await db.rollbackGlobalTransaction()
    }
  })

  group.each.teardown(async () => {
    const nonceKeys = await redis.keys('siwe:nonce:*')
    const blacklistKeys = await redis.keys('token:blacklist:*')
    const allKeys = [...nonceKeys, ...blacklistKeys]
    if (allKeys.length > 0) {
      await redis.del(...allKeys)
    }
  })

  // =============================================================================
  // POST /api/v1/ports - Create Port (Step 1 of two-step flow)
  // =============================================================================

  test('POST /ports creates a new port with pending status', async ({ client, assert }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        name: 'My Payment Port',
        chainId: 5000,
      })

    response.assertStatus(201)
    assert.exists(response.body().id)
    assert.equal(response.body().name, 'My Payment Port')
    assert.equal(response.body().chainId, 5000)
    assert.equal(response.body().status, 'pending')
    assert.isNull(response.body().stealthMetaAddress) // Not set in step 1
    assert.equal(response.body().totalReceived, '0')
    assert.equal(response.body().totalCollected, '0')
    assert.isFalse(response.body().archived)
  })

  test('POST /ports defaults chainId to 5000 (Mantle mainnet)', async ({ client, assert }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        name: 'Default Chain Port',
      })

    response.assertStatus(201)
    assert.equal(response.body().chainId, 5000)
  })

  test('POST /ports defaults name to Unnamed Port', async ({ client, assert }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({})

    response.assertStatus(201)
    assert.equal(response.body().name, 'Unnamed Port')
  })

  test('POST /ports requires authentication', async ({ client }) => {
    const response = await client.post('/api/v1/ports').json({
      name: 'Test Port',
    })

    response.assertStatus(401)
  })

  // =============================================================================
  // Two-step port creation flow (POST + PATCH)
  // =============================================================================

  test('Two-step flow: POST creates port, PATCH adds stealth keys', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    // Step 1: Create port
    const createResponse = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Two-Step Port' })

    createResponse.assertStatus(201)
    const portId = createResponse.body().id
    assert.isNull(createResponse.body().stealthMetaAddress)

    // Step 2: Add stealth keys via PATCH
    const updateResponse = await client
      .patch(`/api/v1/ports/${portId}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        stealthMetaAddress: validStealthMetaAddress,
        viewingKey: validViewingKey,
      })

    updateResponse.assertStatus(200)
    assert.equal(updateResponse.body().stealthMetaAddress, validStealthMetaAddress)

    // Verify viewing key was encrypted
    const port = await Port.query().where('userId', user.id).firstOrFail()
    assert.notEqual(port.viewingKeyEncrypted, validViewingKey)
    assert.equal(port.decryptViewingKey(), validViewingKey)
  })

  test('PATCH /ports/:id rejects duplicate stealth meta address for same user', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)

    // Create first port with stealth address directly
    await createTestPort(user.id, {
      name: 'First Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    // Create second port (step 1)
    const createResponse = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Second Port' })

    // Try to add duplicate stealth address (step 2)
    const response = await client
      .patch(`/api/v1/ports/${createResponse.body().id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        stealthMetaAddress: validStealthMetaAddress,
        viewingKey: validViewingKey,
      })

    response.assertStatus(409)
    assert.equal(response.body().error, 'Port with this stealth meta address already exists')
  })

  test('PATCH /ports/:id allows same stealth meta address for different users', async ({
    client,
  }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )

    // Create port for user 1 with stealth address
    await createTestPort(user1.id, {
      name: 'User 1 Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    // Create port for user 2 (step 1)
    const createResponse = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${token2}`)
      .json({ name: 'User 2 Port' })

    createResponse.assertStatus(201)

    // Add same stealth address for user 2 (step 2) - should succeed
    const updateResponse = await client
      .patch(`/api/v1/ports/${createResponse.body().id}`)
      .header('Authorization', `Bearer ${token2}`)
      .json({
        stealthMetaAddress: validStealthMetaAddress,
        viewingKey: validViewingKey,
      })

    updateResponse.assertStatus(200)
  })

  test('PATCH /ports/:id validates stealthMetaAddress format', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    // Create port
    const createResponse = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Format Test Port' })

    // Try to add invalid stealth address
    const response = await client
      .patch(`/api/v1/ports/${createResponse.body().id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        stealthMetaAddress: 'invalid-format',
        viewingKey: validViewingKey,
      })

    response.assertStatus(422)
  })

  test('PATCH /ports/:id validates viewingKey format', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    // Create port
    const createResponse = await client
      .post('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Format Test Port' })

    // Try to add invalid viewing key
    const response = await client
      .patch(`/api/v1/ports/${createResponse.body().id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        stealthMetaAddress: validStealthMetaAddress,
        viewingKey: 'not-a-valid-key',
      })

    response.assertStatus(422)
  })

  // =============================================================================
  // GET /api/v1/ports - List Ports
  // =============================================================================

  test('GET /ports returns empty array when user has no ports', async ({ client, assert }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 0)
    assert.equal(response.body().meta.total, 0)
  })

  test('GET /ports returns user ports', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    // Create ports directly in DB
    await createTestPort(user.id, {
      name: 'Port 1',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
    })
    await createTestPort(user.id, {
      name: 'Port 2',
      stealthMetaAddress: 'st:mnt:0x' + '2'.repeat(132),
    })

    const response = await client
      .get('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
    assert.equal(response.body().meta.total, 2)
  })

  test('GET /ports excludes archived ports by default', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    await createTestPort(user.id, {
      name: 'Active Port',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
      archived: false,
    })
    await createTestPort(user.id, {
      name: 'Archived Port',
      stealthMetaAddress: 'st:mnt:0x' + '2'.repeat(132),
      archived: true,
    })

    const response = await client
      .get('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].name, 'Active Port')
  })

  test('GET /ports includes archived ports when requested', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    await createTestPort(user.id, {
      name: 'Active Port',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
      archived: false,
    })
    await createTestPort(user.id, {
      name: 'Archived Port',
      stealthMetaAddress: 'st:mnt:0x' + '2'.repeat(132),
      archived: true,
    })

    const response = await client
      .get('/api/v1/ports')
      .qs({ includeArchived: true })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
  })

  test('GET /ports supports pagination', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    // Create 5 ports
    for (let i = 0; i < 5; i++) {
      await createTestPort(user.id, {
        name: `Port ${i}`,
        stealthMetaAddress: `st:mnt:0x${i.toString().repeat(132).slice(0, 132)}`,
      })
    }

    const response = await client
      .get('/api/v1/ports')
      .qs({ page: 1, limit: 2 })
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 2)
    assert.equal(response.body().meta.total, 5)
    assert.equal(response.body().meta.perPage, 2)
    assert.equal(response.body().meta.currentPage, 1)
    assert.equal(response.body().meta.lastPage, 3)
  })

  test('GET /ports does not return other users ports', async ({ client, assert }) => {
    const { accessToken: token1, user: user1 } = await authenticateUser(
      client,
      testWallet,
      TEST_WALLET_ADDRESS
    )
    const { user: user2 } = await authenticateUser(client, testWallet2, TEST_WALLET_ADDRESS_2)

    // Create port for user 1
    await createTestPort(user1.id, {
      name: 'User 1 Port',
      stealthMetaAddress: 'st:mnt:0x' + '1'.repeat(132),
    })

    // Create port for user 2
    await createTestPort(user2.id, {
      name: 'User 2 Port',
      stealthMetaAddress: 'st:mnt:0x' + '2'.repeat(132),
    })

    const response = await client.get('/api/v1/ports').header('Authorization', `Bearer ${token1}`)

    response.assertStatus(200)
    assert.lengthOf(response.body().data, 1)
    assert.equal(response.body().data[0].name, 'User 1 Port')
  })

  test('GET /ports requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/ports')

    response.assertStatus(401)
  })

  test('GET /ports does not expose viewing key', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    await createTestPort(user.id, {
      name: 'Secret Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .get('/api/v1/ports')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    const port = response.body().data[0]
    assert.notExists(port.viewingKey)
    assert.notExists(port.viewingKeyEncrypted)
  })

  // =============================================================================
  // GET /api/v1/ports/:id - Get Single Port
  // =============================================================================

  test('GET /ports/:id returns a single port', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'My Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .get(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    assert.equal(response.body().id, port.id)
    assert.equal(response.body().name, 'My Port')
    assert.exists(response.body().createdAt)
    assert.exists(response.body().updatedAt)
  })

  test('GET /ports/:id returns 404 for non-existent port', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/ports/00000000-0000-0000-0000-000000000000')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
    response.assertBodyContains({ error: 'Port not found' })
  })

  test('GET /ports/:id returns 404 for other users port', async ({ client }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )

    const port = await createTestPort(user1.id, {
      name: 'User 1 Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .get(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${token2}`)

    response.assertStatus(404)
  })

  test('GET /ports/:id requires authentication', async ({ client }) => {
    const response = await client.get('/api/v1/ports/some-id')

    response.assertStatus(401)
  })

  test('GET /ports/:id validates UUID format', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .get('/api/v1/ports/not-a-uuid')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(422)
  })

  // =============================================================================
  // PATCH /api/v1/ports/:id - Update Port
  // =============================================================================

  test('PATCH /ports/:id updates port name', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'Original Name',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'Updated Name' })

    response.assertStatus(200)
    assert.equal(response.body().name, 'Updated Name')

    // Verify in database
    await port.refresh()
    assert.equal(port.name, 'Updated Name')
  })

  test('PATCH /ports/:id archives a port', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'To Archive',
      stealthMetaAddress: validStealthMetaAddress,
      archived: false,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ archived: true })

    response.assertStatus(200)
    assert.isTrue(response.body().archived)

    await port.refresh()
    assert.isTrue(port.archived)
  })

  test('PATCH /ports/:id unarchives a port', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'Archived Port',
      stealthMetaAddress: validStealthMetaAddress,
      archived: true,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ archived: false })

    response.assertStatus(200)
    assert.isFalse(response.body().archived)
  })

  test('PATCH /ports/:id updates multiple fields', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'Original',
      stealthMetaAddress: validStealthMetaAddress,
      archived: false,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({
        name: 'New Name',
        archived: true,
      })

    response.assertStatus(200)
    assert.equal(response.body().name, 'New Name')
    assert.isTrue(response.body().archived)
  })

  test('PATCH /ports/:id returns 404 for non-existent port', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .patch('/api/v1/ports/00000000-0000-0000-0000-000000000000')
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'New Name' })

    response.assertStatus(404)
  })

  test('PATCH /ports/:id returns 404 for other users port', async ({ client, assert }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )

    const port = await createTestPort(user1.id, {
      name: 'User 1 Port',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${token2}`)
      .json({ name: 'Hacked Name' })

    response.assertStatus(404)

    // Verify name was not changed
    await port.refresh()
    assert.equal(port.name, 'User 1 Port')
  })

  test('PATCH /ports/:id requires authentication', async ({ client }) => {
    const response = await client.patch('/api/v1/ports/some-id').json({ name: 'New Name' })

    response.assertStatus(401)
  })

  test('PATCH /ports/:id validates name length', async ({ client }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'Original',
      stealthMetaAddress: validStealthMetaAddress,
    })

    const response = await client
      .patch(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)
      .json({ name: 'a'.repeat(101) }) // Exceeds 100 char limit

    response.assertStatus(422)
  })

  // =============================================================================
  // DELETE /api/v1/ports/:id - Delete (Archive) Port
  // =============================================================================

  test('DELETE /ports/:id archives the port', async ({ client, assert }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'To Delete',
      stealthMetaAddress: validStealthMetaAddress,
      archived: false,
    })

    const response = await client
      .delete(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Port archived successfully' })

    // Verify port is archived, not deleted
    await port.refresh()
    assert.isTrue(port.archived)
  })

  test('DELETE /ports/:id returns 404 for non-existent port', async ({ client }) => {
    const { accessToken } = await authenticateUser(client)

    const response = await client
      .delete('/api/v1/ports/00000000-0000-0000-0000-000000000000')
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(404)
  })

  test('DELETE /ports/:id returns 404 for other users port', async ({ client, assert }) => {
    const { user: user1 } = await authenticateUser(client, testWallet, TEST_WALLET_ADDRESS)
    const { accessToken: token2 } = await authenticateUser(
      client,
      testWallet2,
      TEST_WALLET_ADDRESS_2
    )

    const port = await createTestPort(user1.id, {
      name: 'User 1 Port',
      stealthMetaAddress: validStealthMetaAddress,
      archived: false,
    })

    const response = await client
      .delete(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${token2}`)

    response.assertStatus(404)

    // Verify port was not archived
    await port.refresh()
    assert.isFalse(port.archived)
  })

  test('DELETE /ports/:id requires authentication', async ({ client }) => {
    const response = await client.delete('/api/v1/ports/some-id')

    response.assertStatus(401)
  })

  test('DELETE /ports/:id is idempotent (archiving archived port succeeds)', async ({
    client,
    assert,
  }) => {
    const { accessToken, user } = await authenticateUser(client)

    const port = await createTestPort(user.id, {
      name: 'Already Archived',
      stealthMetaAddress: validStealthMetaAddress,
      archived: true,
    })

    const response = await client
      .delete(`/api/v1/ports/${port.id}`)
      .header('Authorization', `Bearer ${accessToken}`)

    response.assertStatus(200)
    response.assertBodyContains({ message: 'Port archived successfully' })

    await port.refresh()
    assert.isTrue(port.archived)
  })
})
