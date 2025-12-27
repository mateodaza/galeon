import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { ERC5564Announcer } from '../typechain-types'

describe('ERC5564Announcer', function () {
  let announcer: ERC5564Announcer
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>
  let trustedRelayer: Awaited<ReturnType<typeof ethers.getSigner>>
  let untrustedCaller: Awaited<ReturnType<typeof ethers.getSigner>>

  // EIP-5564 scheme ID for secp256k1 with view tags
  const SCHEME_ID = 1

  // Sample test data
  const stealthAddress = '0x1234567890123456789012345678901234567890'
  // 33-byte compressed public key (02 prefix + 32 bytes)
  const ephemeralPubKey =
    '0x02' + '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  // Metadata: 1 byte view tag + 32 byte receipt hash
  const viewTag = '0xab'
  const receiptHash = '0x' + 'deadbeef'.repeat(8)
  const metadata = viewTag + receiptHash.slice(2)

  beforeEach(async function () {
    ;[owner, trustedRelayer, untrustedCaller] = await ethers.getSigners()

    const Announcer = await ethers.getContractFactory('ERC5564Announcer')
    announcer = await Announcer.deploy()
    await announcer.waitForDeployment()
  })

  describe('Deployment', function () {
    it('Should deploy successfully', async function () {
      expect(await announcer.getAddress()).to.be.properAddress
    })

    it('Should set deployer as owner', async function () {
      expect(await announcer.owner()).to.equal(owner.address)
    })
  })

  describe('Trusted Relayer Management', function () {
    it('Should allow owner to add trusted relayer', async function () {
      await expect(announcer.connect(owner).setTrustedRelayer(trustedRelayer.address, true))
        .to.emit(announcer, 'TrustedRelayerUpdated')
        .withArgs(trustedRelayer.address, true)

      expect(await announcer.trustedRelayers(trustedRelayer.address)).to.be.true
    })

    it('Should allow owner to remove trusted relayer', async function () {
      await announcer.connect(owner).setTrustedRelayer(trustedRelayer.address, true)
      await announcer.connect(owner).setTrustedRelayer(trustedRelayer.address, false)

      expect(await announcer.trustedRelayers(trustedRelayer.address)).to.be.false
    })

    it('Should reject non-owner setting trusted relayer', async function () {
      await expect(
        announcer.connect(untrustedCaller).setTrustedRelayer(trustedRelayer.address, true)
      ).to.be.revertedWithCustomError(announcer, 'OwnableUnauthorizedAccount')
    })
  })

  describe('announce()', function () {
    it('Should emit Announcement event with correct parameters', async function () {
      await expect(
        announcer
          .connect(untrustedCaller)
          .announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata)
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(SCHEME_ID, stealthAddress, untrustedCaller.address, ephemeralPubKey, metadata)
    })

    it('Should allow anyone to call announce', async function () {
      // Owner can announce
      await expect(
        announcer.connect(owner).announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata)
      ).to.not.be.reverted

      // Random caller can announce
      await expect(
        announcer
          .connect(untrustedCaller)
          .announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata)
      ).to.not.be.reverted
    })

    it('Should work with different scheme IDs', async function () {
      const schemeId2 = 2

      await expect(
        announcer
          .connect(untrustedCaller)
          .announce(schemeId2, stealthAddress, ephemeralPubKey, metadata)
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(schemeId2, stealthAddress, untrustedCaller.address, ephemeralPubKey, metadata)
    })

    it('Should work with empty metadata', async function () {
      await expect(
        announcer
          .connect(untrustedCaller)
          .announce(SCHEME_ID, stealthAddress, ephemeralPubKey, '0x')
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(SCHEME_ID, stealthAddress, untrustedCaller.address, ephemeralPubKey, '0x')
    })

    it('Should work with different ephemeral public key lengths', async function () {
      // 65-byte uncompressed public key (04 prefix)
      const uncompressedPubKey = '0x04' + 'ab'.repeat(64)

      await expect(
        announcer
          .connect(untrustedCaller)
          .announce(SCHEME_ID, stealthAddress, uncompressedPubKey, metadata)
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(SCHEME_ID, stealthAddress, untrustedCaller.address, uncompressedPubKey, metadata)
    })

    it('Should correctly index schemeId, stealthAddress, and caller', async function () {
      const tx = await announcer
        .connect(untrustedCaller)
        .announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata)
      const receipt = await tx.wait()

      // Get the event from logs
      const event = receipt?.logs[0]
      expect(event).to.not.be.undefined

      // Verify indexed topics (schemeId, stealthAddress, caller)
      // topics[0] is event signature, topics[1-3] are indexed params
      const iface = announcer.interface
      const parsedLog = iface.parseLog({
        topics: event!.topics as string[],
        data: event!.data,
      })

      expect(parsedLog?.args.schemeId).to.equal(BigInt(SCHEME_ID))
      expect(parsedLog?.args.stealthAddress.toLowerCase()).to.equal(stealthAddress.toLowerCase())
      expect(parsedLog?.args.caller.toLowerCase()).to.equal(untrustedCaller.address.toLowerCase())
    })
  })

  describe('announceFor()', function () {
    beforeEach(async function () {
      // Set up trusted relayer before each test
      await announcer.connect(owner).setTrustedRelayer(trustedRelayer.address, true)
    })

    it('Should emit Announcement event with explicit caller when called by trusted relayer', async function () {
      const payerAddress = '0x1111111111111111111111111111111111111111'

      await expect(
        announcer
          .connect(trustedRelayer)
          .announceFor(SCHEME_ID, stealthAddress, payerAddress, ephemeralPubKey, metadata)
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(SCHEME_ID, stealthAddress, payerAddress, ephemeralPubKey, metadata)
    })

    it('Should allow any address as caller parameter', async function () {
      const arbitraryAddress = '0x0000000000000000000000000000000000001234'

      await expect(
        announcer
          .connect(trustedRelayer)
          .announceFor(SCHEME_ID, stealthAddress, arbitraryAddress, ephemeralPubKey, metadata)
      )
        .to.emit(announcer, 'Announcement')
        .withArgs(SCHEME_ID, stealthAddress, arbitraryAddress, ephemeralPubKey, metadata)
    })

    it('Should reject announceFor from untrusted caller (prevents spoofing)', async function () {
      const victimAddress = '0x2222222222222222222222222222222222222222'

      // Untrusted caller trying to spoof an announcement
      await expect(
        announcer
          .connect(untrustedCaller)
          .announceFor(SCHEME_ID, stealthAddress, victimAddress, ephemeralPubKey, metadata)
      ).to.be.revertedWith('Not a trusted relayer')
    })

    it('Should reject announceFor from owner if owner is not trusted relayer', async function () {
      // Owner is not automatically a trusted relayer
      expect(await announcer.trustedRelayers(owner.address)).to.be.false

      await expect(
        announcer
          .connect(owner)
          .announceFor(
            SCHEME_ID,
            stealthAddress,
            untrustedCaller.address,
            ephemeralPubKey,
            metadata
          )
      ).to.be.revertedWith('Not a trusted relayer')
    })
  })

  describe('Gas efficiency', function () {
    it('Should have reasonable gas cost for announce', async function () {
      const tx = await announcer
        .connect(untrustedCaller)
        .announce(SCHEME_ID, stealthAddress, ephemeralPubKey, metadata)
      const receipt = await tx.wait()

      // Announcement should cost less than 50k gas (it's just an event emission)
      expect(receipt?.gasUsed).to.be.lessThan(50000n)
    })

    it('Should have reasonable gas cost for announceFor', async function () {
      // Set up trusted relayer first
      await announcer.connect(owner).setTrustedRelayer(trustedRelayer.address, true)

      const tx = await announcer
        .connect(trustedRelayer)
        .announceFor(SCHEME_ID, stealthAddress, untrustedCaller.address, ephemeralPubKey, metadata)
      const receipt = await tx.wait()

      // announceFor should cost similar to announce (plus one storage read)
      expect(receipt?.gasUsed).to.be.lessThan(55000n)
    })
  })
})
