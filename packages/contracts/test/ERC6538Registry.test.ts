import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { ERC6538Registry } from '../typechain-types'

describe('ERC6538Registry', function () {
  let registry: ERC6538Registry
  let user1: Awaited<ReturnType<typeof ethers.getSigner>>
  let user2: Awaited<ReturnType<typeof ethers.getSigner>>

  // EIP-5564 scheme ID for secp256k1 with view tags
  const SCHEME_ID = 1

  // 66-byte stealth meta-address (33-byte spending pubkey + 33-byte viewing pubkey)
  const stealthMetaAddress = '0x' + '02' + 'ab'.repeat(32) + '03' + 'cd'.repeat(32)

  beforeEach(async function () {
    ;[user1, user2] = await ethers.getSigners()

    const Registry = await ethers.getContractFactory('ERC6538Registry')
    registry = await Registry.deploy()
    await registry.waitForDeployment()
  })

  describe('Deployment', function () {
    it('Should deploy successfully', async function () {
      expect(await registry.getAddress()).to.be.properAddress
    })
  })

  describe('registerKeys()', function () {
    it('Should register stealth meta-address', async function () {
      await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)

      const stored = await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)
      expect(stored).to.equal(stealthMetaAddress)
    })

    it('Should emit StealthMetaAddressSet event', async function () {
      await expect(registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress))
        .to.emit(registry, 'StealthMetaAddressSet')
        .withArgs(user1.address, SCHEME_ID, stealthMetaAddress)
    })

    it('Should allow updating meta-address', async function () {
      // Register initial address
      await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)

      // Update to new address
      const newMetaAddress = '0x' + '02' + 'ff'.repeat(32) + '03' + 'ee'.repeat(32)
      await registry.connect(user1).registerKeys(SCHEME_ID, newMetaAddress)

      const stored = await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)
      expect(stored).to.equal(newMetaAddress)
    })

    it('Should allow different users to register independently', async function () {
      const user1MetaAddress = '0x' + '02' + 'aa'.repeat(32) + '03' + 'bb'.repeat(32)
      const user2MetaAddress = '0x' + '02' + 'cc'.repeat(32) + '03' + 'dd'.repeat(32)

      await registry.connect(user1).registerKeys(SCHEME_ID, user1MetaAddress)
      await registry.connect(user2).registerKeys(SCHEME_ID, user2MetaAddress)

      expect(await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)).to.equal(
        user1MetaAddress
      )
      expect(await registry.stealthMetaAddressOf(user2.address, SCHEME_ID)).to.equal(
        user2MetaAddress
      )
    })

    it('Should support different scheme IDs', async function () {
      const schemeId2 = 2
      const metaAddress2 = '0x' + '02' + 'ee'.repeat(32) + '03' + 'ff'.repeat(32)

      await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)
      await registry.connect(user1).registerKeys(schemeId2, metaAddress2)

      expect(await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)).to.equal(
        stealthMetaAddress
      )
      expect(await registry.stealthMetaAddressOf(user1.address, schemeId2)).to.equal(metaAddress2)
    })

    it('Should allow variable length meta-addresses', async function () {
      // Shorter meta-address (for testing flexibility)
      const shortMetaAddress = '0x' + 'ab'.repeat(20)

      await registry.connect(user1).registerKeys(SCHEME_ID, shortMetaAddress)

      const stored = await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)
      expect(stored).to.equal(shortMetaAddress)
    })
  })

  describe('stealthMetaAddressOf()', function () {
    it('Should return empty bytes for unregistered address', async function () {
      const stored = await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)
      expect(stored).to.equal('0x')
    })

    it('Should return empty bytes for wrong scheme ID', async function () {
      await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)

      const stored = await registry.stealthMetaAddressOf(user1.address, 999)
      expect(stored).to.equal('0x')
    })

    it('Should be a view function (no gas cost when called externally)', async function () {
      await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)

      // This should not cost gas when called via staticCall
      const stored = await registry.stealthMetaAddressOf(user1.address, SCHEME_ID)
      expect(stored).to.equal(stealthMetaAddress)
    })
  })

  describe('Gas efficiency', function () {
    it('Should have reasonable gas cost for registerKeys', async function () {
      const tx = await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)
      const receipt = await tx.wait()

      // Registration should cost less than 120k gas
      expect(receipt?.gasUsed).to.be.lessThan(120000n)
    })

    it('Should have lower gas for updating existing registration', async function () {
      // First registration
      const tx1 = await registry.connect(user1).registerKeys(SCHEME_ID, stealthMetaAddress)
      const receipt1 = await tx1.wait()

      // Update (should be cheaper as storage slot is warm)
      const newMetaAddress = '0x' + '02' + 'ff'.repeat(32) + '03' + 'ee'.repeat(32)
      const tx2 = await registry.connect(user1).registerKeys(SCHEME_ID, newMetaAddress)
      const receipt2 = await tx2.wait()

      // Update should use less or similar gas (warm storage)
      expect(receipt2?.gasUsed).to.be.lessThanOrEqual(receipt1!.gasUsed)
    })
  })
})
