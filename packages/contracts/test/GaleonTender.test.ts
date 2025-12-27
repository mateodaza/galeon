import { expect } from 'chai'
import { ethers } from 'hardhat'
import type { GaleonTender, MockERC20 } from '../typechain-types'

describe('GaleonTender', function () {
  let tender: GaleonTender
  let mockToken: MockERC20
  let owner: Awaited<ReturnType<typeof ethers.getSigner>>
  let relayer: Awaited<ReturnType<typeof ethers.getSigner>>
  let recipient: Awaited<ReturnType<typeof ethers.getSigner>>
  let stealthWallet: Awaited<ReturnType<typeof ethers.getSigner>>

  beforeEach(async function () {
    ;[owner, relayer, recipient, stealthWallet] = await ethers.getSigners()

    // Deploy GaleonTender
    const GaleonTender = await ethers.getContractFactory('GaleonTender')
    tender = await GaleonTender.deploy()
    await tender.waitForDeployment()

    // Deploy mock token
    const MockToken = await ethers.getContractFactory('MockERC20')
    mockToken = await MockToken.deploy('Mock USDT', 'MUSDT', 6)
    await mockToken.waitForDeployment()
  })

  describe('Deployment', function () {
    it('Should deploy successfully', async function () {
      expect(await tender.getAddress()).to.be.properAddress
    })

    it('Should set deployer as owner', async function () {
      expect(await tender.owner()).to.equal(owner.address)
    })
  })

  describe('Receiving Native Currency', function () {
    it('Should receive native currency via direct transfer', async function () {
      const amount = ethers.parseEther('1.0')

      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: amount,
      })

      expect(await ethers.provider.getBalance(await tender.getAddress())).to.equal(amount)
    })

    it('Should receive native currency from multiple sources', async function () {
      const amount1 = ethers.parseEther('1.0')
      const amount2 = ethers.parseEther('0.5')

      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: amount1,
      })

      await relayer.sendTransaction({
        to: await tender.getAddress(),
        value: amount2,
      })

      expect(await ethers.provider.getBalance(await tender.getAddress())).to.equal(
        amount1 + amount2
      )
    })
  })

  describe('forwardNative()', function () {
    const depositAmount = ethers.parseEther('2.0')

    beforeEach(async function () {
      // Deposit native currency into tender
      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: depositAmount,
      })
    })

    it('Should forward native currency to recipient', async function () {
      const recipientBalanceBefore = await ethers.provider.getBalance(recipient.address)

      await tender.connect(owner).forwardNative(recipient.address, 5)

      const recipientBalanceAfter = await ethers.provider.getBalance(recipient.address)
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(depositAmount)
    })

    it('Should emit Forwarded event', async function () {
      const stealthCount = 5

      await expect(tender.connect(owner).forwardNative(recipient.address, stealthCount))
        .to.emit(tender, 'Forwarded')
        .withArgs(recipient.address, ethers.ZeroAddress, depositAmount, stealthCount)
    })

    it('Should empty the tender balance', async function () {
      await tender.connect(owner).forwardNative(recipient.address, 1)

      expect(await ethers.provider.getBalance(await tender.getAddress())).to.equal(0)
    })

    it('Should reject if not owner', async function () {
      await expect(
        tender.connect(relayer).forwardNative(recipient.address, 1)
      ).to.be.revertedWithCustomError(tender, 'OwnableUnauthorizedAccount')
    })

    it('Should reject if no balance', async function () {
      // Forward once to empty balance
      await tender.connect(owner).forwardNative(recipient.address, 1)

      // Try to forward again
      await expect(tender.connect(owner).forwardNative(recipient.address, 1)).to.be.revertedWith(
        'No balance'
      )
    })
  })

  describe('forwardToken()', function () {
    const tokenAmount = 1000000n // 1 USDT (6 decimals)

    beforeEach(async function () {
      // Mint tokens directly to tender (simulating stealth transfers)
      await mockToken.mint(await tender.getAddress(), tokenAmount)
    })

    it('Should forward tokens to recipient', async function () {
      const recipientBalanceBefore = await mockToken.balanceOf(recipient.address)

      await tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 3)

      const recipientBalanceAfter = await mockToken.balanceOf(recipient.address)
      expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(tokenAmount)
    })

    it('Should emit Forwarded event with token address', async function () {
      const stealthCount = 3

      await expect(
        tender
          .connect(owner)
          .forwardToken(await mockToken.getAddress(), recipient.address, stealthCount)
      )
        .to.emit(tender, 'Forwarded')
        .withArgs(recipient.address, await mockToken.getAddress(), tokenAmount, stealthCount)
    })

    it('Should empty the tender token balance', async function () {
      await tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 1)

      expect(await mockToken.balanceOf(await tender.getAddress())).to.equal(0)
    })

    it('Should reject if not owner', async function () {
      await expect(
        tender.connect(relayer).forwardToken(await mockToken.getAddress(), recipient.address, 1)
      ).to.be.revertedWithCustomError(tender, 'OwnableUnauthorizedAccount')
    })

    it('Should reject if no token balance', async function () {
      // Forward once to empty balance
      await tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 1)

      // Try to forward again
      await expect(
        tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 1)
      ).to.be.revertedWith('No balance')
    })

    it('Should handle multiple token types', async function () {
      // Deploy second token
      const MockToken2 = await ethers.getContractFactory('MockERC20')
      const mockToken2 = await MockToken2.deploy('Mock USDC', 'MUSDC', 6)
      await mockToken2.waitForDeployment()

      // Mint second token to tender
      const token2Amount = 2000000n
      await mockToken2.mint(await tender.getAddress(), token2Amount)

      // Forward first token
      await tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 1)
      expect(await mockToken.balanceOf(recipient.address)).to.equal(tokenAmount)

      // Forward second token
      await tender.connect(owner).forwardToken(await mockToken2.getAddress(), recipient.address, 2)
      expect(await mockToken2.balanceOf(recipient.address)).to.equal(token2Amount)
    })
  })

  describe('Ownership', function () {
    it('Should allow owner to transfer ownership', async function () {
      await tender.connect(owner).transferOwnership(relayer.address)
      expect(await tender.owner()).to.equal(relayer.address)
    })

    it('Should allow new owner to forward', async function () {
      await tender.connect(owner).transferOwnership(relayer.address)

      // Deposit some native currency
      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: ethers.parseEther('1.0'),
      })

      // New owner can forward
      await expect(tender.connect(relayer).forwardNative(recipient.address, 1)).to.not.be.reverted
    })

    it('Should prevent old owner from forwarding after transfer', async function () {
      await tender.connect(owner).transferOwnership(relayer.address)

      // Deposit some native currency
      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: ethers.parseEther('1.0'),
      })

      // Old owner cannot forward
      await expect(
        tender.connect(owner).forwardNative(recipient.address, 1)
      ).to.be.revertedWithCustomError(tender, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Gas Efficiency', function () {
    it('Should have reasonable gas for forwardNative', async function () {
      // Deposit
      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: ethers.parseEther('1.0'),
      })

      const tx = await tender.connect(owner).forwardNative(recipient.address, 10)
      const receipt = await tx.wait()

      // Forward should cost less than 100k gas
      expect(receipt?.gasUsed).to.be.lessThan(100000n)
    })

    it('Should have reasonable gas for forwardToken', async function () {
      await mockToken.mint(await tender.getAddress(), 1000000n)

      const tx = await tender
        .connect(owner)
        .forwardToken(await mockToken.getAddress(), recipient.address, 10)
      const receipt = await tx.wait()

      // Forward should cost less than 100k gas
      expect(receipt?.gasUsed).to.be.lessThan(100000n)
    })
  })

  describe('Edge Cases', function () {
    it('Should handle very small native amounts', async function () {
      const tinyAmount = 1n // 1 wei

      await stealthWallet.sendTransaction({
        to: await tender.getAddress(),
        value: tinyAmount,
      })

      await expect(tender.connect(owner).forwardNative(recipient.address, 1)).to.not.be.reverted
    })

    it('Should handle very small token amounts', async function () {
      const tinyAmount = 1n // 1 smallest unit

      await mockToken.mint(await tender.getAddress(), tinyAmount)

      await expect(
        tender.connect(owner).forwardToken(await mockToken.getAddress(), recipient.address, 1)
      ).to.not.be.reverted
    })
  })
})
