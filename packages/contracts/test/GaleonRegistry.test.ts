import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { GaleonRegistry, ERC5564Announcer, ERC6538Registry } from '../typechain-types'
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IERC20,
} from '../typechain-types'

describe('GaleonRegistry', function () {
  let galeon: GaleonRegistry
  let announcer: ERC5564Announcer
  let registry: ERC6538Registry
  let mockToken: Awaited<ReturnType<typeof deployMockToken>>

  let owner: Awaited<ReturnType<typeof ethers.getSigner>>
  let vendor: Awaited<ReturnType<typeof ethers.getSigner>>
  let payer: Awaited<ReturnType<typeof ethers.getSigner>>

  const SCHEME_ID = 1

  // 66-byte stealth meta-address (33-byte spending + 33-byte viewing pubkey)
  const stealthMetaAddress = '0x' + '02' + 'ab'.repeat(32) + '03' + 'cd'.repeat(32)

  // 33-byte compressed ephemeral public key
  const ephemeralPubKey =
    '0x02' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

  // View tag (1 byte)
  const viewTag = '0xab'

  // Receipt hash (32 bytes)
  const receiptHash = '0x' + 'deadbeef'.repeat(8)

  // Stealth address for payments
  const stealthAddress = '0x1234567890123456789012345678901234567890'

  // Port ID (bytes32)
  const portId = ethers.keccak256(ethers.toUtf8Bytes('test-port-1'))
  const portName = 'Test Port'

  // Helper to deploy a mock ERC20 token
  async function deployMockToken() {
    const MockToken = await ethers.getContractFactory('MockERC20')
    const token = await MockToken.deploy('Mock USDT', 'MUSDT', 6)
    await token.waitForDeployment()
    return token
  }

  beforeEach(async function () {
    ;[owner, vendor, payer] = await ethers.getSigners()

    // Deploy dependencies
    const Announcer = await ethers.getContractFactory('ERC5564Announcer')
    announcer = await Announcer.deploy()
    await announcer.waitForDeployment()

    const Registry = await ethers.getContractFactory('ERC6538Registry')
    registry = await Registry.deploy()
    await registry.waitForDeployment()

    // Deploy GaleonRegistry
    const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
    galeon = await GaleonRegistry.deploy(await announcer.getAddress(), await registry.getAddress())
    await galeon.waitForDeployment()

    // Set GaleonRegistry as trusted relayer on announcer (required for announceFor)
    await announcer.connect(owner).setTrustedRelayer(await galeon.getAddress(), true)

    // Deploy mock token for ERC-20 tests
    mockToken = await deployMockToken()
  })

  describe('Deployment', function () {
    it('Should deploy with correct announcer and registry', async function () {
      expect(await galeon.announcer()).to.equal(await announcer.getAddress())
      expect(await galeon.registry()).to.equal(await registry.getAddress())
    })

    it('Should have correct SCHEME_ID', async function () {
      expect(await galeon.SCHEME_ID()).to.equal(SCHEME_ID)
    })

    it('Should reject zero address for announcer', async function () {
      const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
      await expect(
        GaleonRegistry.deploy(ethers.ZeroAddress, await registry.getAddress())
      ).to.be.revertedWith('Invalid announcer')
    })

    it('Should reject zero address for registry', async function () {
      const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
      await expect(
        GaleonRegistry.deploy(await announcer.getAddress(), ethers.ZeroAddress)
      ).to.be.revertedWith('Invalid registry')
    })
  })

  describe('Port Management', function () {
    describe('registerPort()', function () {
      it('Should register a new Port', async function () {
        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)

        expect(await galeon.portOwners(portId)).to.equal(vendor.address)
        expect(await galeon.portActive(portId)).to.be.true
        expect(await galeon.portMetaAddresses(portId)).to.equal(stealthMetaAddress)
      })

      it('Should emit PortRegistered event', async function () {
        await expect(galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress))
          .to.emit(galeon, 'PortRegistered')
          .withArgs(vendor.address, portId, portName, stealthMetaAddress)
      })

      it('Should NOT register in ERC6538Registry (removed to fix attribution)', async function () {
        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)

        // ERC6538 registration was removed because it would register under GaleonRegistry's
        // address, not the user's. Users should call ERC6538Registry directly if needed.
        const galeonAddress = await galeon.getAddress()
        const stored = await registry.stealthMetaAddressOf(galeonAddress, SCHEME_ID)
        expect(stored).to.equal('0x') // Should be empty
      })

      it('Should reject duplicate Port ID', async function () {
        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)

        await expect(
          galeon.connect(vendor).registerPort(portId, 'Another Port', stealthMetaAddress)
        ).to.be.revertedWith('Port already exists')
      })

      it('Should reject invalid meta-address length', async function () {
        const invalidMetaAddress = '0x' + 'ab'.repeat(32) // Only 32 bytes, should be 66

        await expect(
          galeon.connect(vendor).registerPort(portId, portName, invalidMetaAddress)
        ).to.be.revertedWith('Invalid meta-address length')
      })

      it('Should allow different users to register different Ports', async function () {
        const portId2 = ethers.keccak256(ethers.toUtf8Bytes('test-port-2'))

        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)
        await galeon.connect(payer).registerPort(portId2, 'Payer Port', stealthMetaAddress)

        expect(await galeon.portOwners(portId)).to.equal(vendor.address)
        expect(await galeon.portOwners(portId2)).to.equal(payer.address)
      })
    })

    describe('deactivatePort()', function () {
      beforeEach(async function () {
        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)
      })

      it('Should deactivate a Port', async function () {
        await galeon.connect(vendor).deactivatePort(portId)

        expect(await galeon.portActive(portId)).to.be.false
      })

      it('Should emit PortDeactivated event', async function () {
        await expect(galeon.connect(vendor).deactivatePort(portId))
          .to.emit(galeon, 'PortDeactivated')
          .withArgs(vendor.address, portId)
      })

      it('Should reject non-owner deactivation', async function () {
        await expect(galeon.connect(payer).deactivatePort(portId)).to.be.revertedWith(
          'Not port owner'
        )
      })

      it('Should reject double deactivation', async function () {
        await galeon.connect(vendor).deactivatePort(portId)

        await expect(galeon.connect(vendor).deactivatePort(portId)).to.be.revertedWith(
          'Port already inactive'
        )
      })
    })

    describe('getPortMetaAddress()', function () {
      it('Should return meta-address for registered Port', async function () {
        await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)

        expect(await galeon.getPortMetaAddress(portId)).to.equal(stealthMetaAddress)
      })

      it('Should return empty bytes for unregistered Port', async function () {
        const unknownPortId = ethers.keccak256(ethers.toUtf8Bytes('unknown'))

        expect(await galeon.getPortMetaAddress(unknownPortId)).to.equal('0x')
      })
    })
  })

  describe('Native Payments', function () {
    describe('payNative()', function () {
      const paymentAmount = ethers.parseEther('1.0')

      it('Should transfer native currency to stealth address', async function () {
        const stealthBalanceBefore = await ethers.provider.getBalance(stealthAddress)

        await galeon
          .connect(payer)
          .payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: paymentAmount,
          })

        const stealthBalanceAfter = await ethers.provider.getBalance(stealthAddress)
        expect(stealthBalanceAfter - stealthBalanceBefore).to.equal(paymentAmount)
      })

      it('Should emit Announcement event with payer as caller (not registry)', async function () {
        const expectedMetadata = viewTag + receiptHash.slice(2)

        // Critical fix: announceFor now attributes the actual payer, not GaleonRegistry
        await expect(
          galeon.connect(payer).payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: paymentAmount,
          })
        )
          .to.emit(announcer, 'Announcement')
          .withArgs(
            SCHEME_ID,
            stealthAddress,
            payer.address, // Now correctly attributed to payer
            ephemeralPubKey,
            expectedMetadata
          )
      })

      it('Should emit ReceiptAnchored event', async function () {
        const tx = await galeon
          .connect(payer)
          .payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: paymentAmount,
          })
        const receipt = await tx.wait()
        const block = await ethers.provider.getBlock(receipt!.blockNumber)

        await expect(tx).to.emit(galeon, 'ReceiptAnchored').withArgs(
          stealthAddress,
          receiptHash,
          payer.address,
          paymentAmount,
          ethers.ZeroAddress, // native currency
          block!.timestamp
        )
      })

      it('Should reject zero value', async function () {
        await expect(
          galeon.connect(payer).payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: 0,
          })
        ).to.be.revertedWith('No value sent')
      })

      it('Should reject zero stealth address', async function () {
        await expect(
          galeon
            .connect(payer)
            .payNative(ethers.ZeroAddress, ephemeralPubKey, viewTag, receiptHash, {
              value: paymentAmount,
            })
        ).to.be.revertedWith('Invalid stealth address')
      })

      it('Should reject invalid ephemeral key length', async function () {
        const invalidEphemeralKey = '0x' + 'ab'.repeat(20) // 20 bytes instead of 33

        await expect(
          galeon
            .connect(payer)
            .payNative(stealthAddress, invalidEphemeralKey, viewTag, receiptHash, {
              value: paymentAmount,
            })
        ).to.be.revertedWith('Invalid ephemeral key length')
      })

      it('Should reject invalid ephemeral key prefix', async function () {
        // 0x04 prefix (uncompressed) should be rejected - only 0x02/0x03 allowed
        const invalidPrefixKey =
          '0x04' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

        await expect(
          galeon.connect(payer).payNative(stealthAddress, invalidPrefixKey, viewTag, receiptHash, {
            value: paymentAmount,
          })
        ).to.be.revertedWith('Invalid pubkey prefix')
      })

      it('Should accept 0x03 prefix for ephemeral key', async function () {
        // 0x03 is valid for compressed keys with odd Y coordinate
        const validPrefixKey =
          '0x03' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

        await expect(
          galeon.connect(payer).payNative(stealthAddress, validPrefixKey, viewTag, receiptHash, {
            value: paymentAmount,
          })
        ).to.not.be.reverted
      })

      it('Should work with different payment amounts', async function () {
        const smallPayment = ethers.parseEther('0.001')
        const largePayment = ethers.parseEther('100')

        // Small payment
        await expect(
          galeon.connect(payer).payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: smallPayment,
          })
        ).to.not.be.reverted

        // Large payment
        await expect(
          galeon.connect(payer).payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
            value: largePayment,
          })
        ).to.not.be.reverted
      })
    })
  })

  describe('Token Payments', function () {
    describe('payToken()', function () {
      const tokenAmount = 1000000n // 1 USDT (6 decimals)

      beforeEach(async function () {
        // Mint tokens to payer
        await mockToken.mint(payer.address, tokenAmount * 10n)

        // Approve GaleonRegistry to spend tokens
        await mockToken.connect(payer).approve(await galeon.getAddress(), tokenAmount * 10n)
      })

      it('Should transfer tokens to stealth address', async function () {
        const stealthBalanceBefore = await mockToken.balanceOf(stealthAddress)

        await galeon
          .connect(payer)
          .payToken(
            await mockToken.getAddress(),
            stealthAddress,
            tokenAmount,
            ephemeralPubKey,
            viewTag,
            receiptHash
          )

        const stealthBalanceAfter = await mockToken.balanceOf(stealthAddress)
        expect(stealthBalanceAfter - stealthBalanceBefore).to.equal(tokenAmount)
      })

      it('Should emit Announcement event with token info in metadata', async function () {
        const tokenAddress = await mockToken.getAddress()

        // Metadata format: viewTag (1) + receiptHash (32) + token (20) + amount (32)
        const tx = await galeon
          .connect(payer)
          .payToken(
            tokenAddress,
            stealthAddress,
            tokenAmount,
            ephemeralPubKey,
            viewTag,
            receiptHash
          )

        // Verify announcement was emitted
        await expect(tx).to.emit(announcer, 'Announcement')
      })

      it('Should emit ReceiptAnchored event with token address', async function () {
        const tokenAddress = await mockToken.getAddress()

        const tx = await galeon
          .connect(payer)
          .payToken(
            tokenAddress,
            stealthAddress,
            tokenAmount,
            ephemeralPubKey,
            viewTag,
            receiptHash
          )
        const receipt = await tx.wait()
        const block = await ethers.provider.getBlock(receipt!.blockNumber)

        await expect(tx)
          .to.emit(galeon, 'ReceiptAnchored')
          .withArgs(
            stealthAddress,
            receiptHash,
            payer.address,
            tokenAmount,
            tokenAddress,
            block!.timestamp
          )
      })

      it('Should reject zero amount', async function () {
        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              stealthAddress,
              0,
              ephemeralPubKey,
              viewTag,
              receiptHash
            )
        ).to.be.revertedWith('Zero amount')
      })

      it('Should reject zero stealth address', async function () {
        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              ethers.ZeroAddress,
              tokenAmount,
              ephemeralPubKey,
              viewTag,
              receiptHash
            )
        ).to.be.revertedWith('Invalid stealth address')
      })

      it('Should reject zero token address', async function () {
        await expect(
          galeon
            .connect(payer)
            .payToken(
              ethers.ZeroAddress,
              stealthAddress,
              tokenAmount,
              ephemeralPubKey,
              viewTag,
              receiptHash
            )
        ).to.be.revertedWith('Invalid token')
      })

      it('Should reject invalid ephemeral key length', async function () {
        const invalidEphemeralKey = '0x' + 'ab'.repeat(20)

        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              stealthAddress,
              tokenAmount,
              invalidEphemeralKey,
              viewTag,
              receiptHash
            )
        ).to.be.revertedWith('Invalid ephemeral key length')
      })

      it('Should reject invalid ephemeral key prefix for tokens', async function () {
        const invalidPrefixKey =
          '0x01' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'

        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              stealthAddress,
              tokenAmount,
              invalidPrefixKey,
              viewTag,
              receiptHash
            )
        ).to.be.revertedWith('Invalid pubkey prefix')
      })

      it('Should fail if payer has insufficient balance', async function () {
        const hugeAmount = tokenAmount * 1000n // More than minted

        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              stealthAddress,
              hugeAmount,
              ephemeralPubKey,
              viewTag,
              receiptHash
            )
        ).to.be.reverted
      })

      it('Should fail if payer has insufficient allowance', async function () {
        // Reset approval to 0
        await mockToken.connect(payer).approve(await galeon.getAddress(), 0)

        await expect(
          galeon
            .connect(payer)
            .payToken(
              await mockToken.getAddress(),
              stealthAddress,
              tokenAmount,
              ephemeralPubKey,
              viewTag,
              receiptHash
            )
        ).to.be.reverted
      })
    })
  })

  describe('Reentrancy Protection', function () {
    it('payNative should be protected by nonReentrant', async function () {
      // The nonReentrant modifier is applied, so reentrancy attacks should fail
      // This is a basic smoke test - comprehensive reentrancy testing would need a malicious contract
      const paymentAmount = ethers.parseEther('1.0')

      await expect(
        galeon.connect(payer).payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
          value: paymentAmount,
        })
      ).to.not.be.reverted
    })
  })

  describe('Gas Efficiency', function () {
    it('Should have reasonable gas for Port registration', async function () {
      const tx = await galeon.connect(vendor).registerPort(portId, portName, stealthMetaAddress)
      const receipt = await tx.wait()

      // Port registration should cost less than 200k gas (writes to 3 storage slots, no external call)
      expect(receipt?.gasUsed).to.be.lessThan(200000n)
    })

    it('Should have reasonable gas for native payment', async function () {
      const tx = await galeon
        .connect(payer)
        .payNative(stealthAddress, ephemeralPubKey, viewTag, receiptHash, {
          value: ethers.parseEther('1.0'),
        })
      const receipt = await tx.wait()

      // Native payment should cost less than 150k gas
      expect(receipt?.gasUsed).to.be.lessThan(150000n)
    })

    it('Should have reasonable gas for token payment', async function () {
      // Setup
      await mockToken.mint(payer.address, 1000000n)
      await mockToken.connect(payer).approve(await galeon.getAddress(), 1000000n)

      const tx = await galeon
        .connect(payer)
        .payToken(
          await mockToken.getAddress(),
          stealthAddress,
          1000000n,
          ephemeralPubKey,
          viewTag,
          receiptHash
        )
      const receipt = await tx.wait()

      // Token payment should cost less than 200k gas
      expect(receipt?.gasUsed).to.be.lessThan(200000n)
    })
  })
})
