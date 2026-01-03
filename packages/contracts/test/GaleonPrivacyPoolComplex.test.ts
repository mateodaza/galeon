import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import type {
  GaleonEntrypoint,
  GaleonPrivacyPoolComplex,
  MockVerifier,
  MockGaleonRegistry,
  MockERC20,
} from '../typechain-types'

describe('GaleonPrivacyPoolComplex', function () {
  // Test accounts
  let owner: HardhatEthersSigner
  let postman: HardhatEthersSigner
  let depositor: HardhatEthersSigner
  let blockedDepositor: HardhatEthersSigner
  let nonPortDepositor: HardhatEthersSigner
  let other: HardhatEthersSigner

  // Contract instances
  let entrypoint: GaleonEntrypoint
  let pool: GaleonPrivacyPoolComplex
  let mockVerifier: MockVerifier
  let mockRegistry: MockGaleonRegistry
  let mockToken: MockERC20

  // Poseidon library addresses (for upgrades)
  let poseidonT3Address: string
  let poseidonT4Address: string

  // Constants
  const MIN_DEPOSIT = ethers.parseEther('0.01')
  const VETTING_FEE_BPS = 100n // 1%
  const MAX_RELAY_FEE_BPS = 200n // 2%
  const VALID_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
  const INITIAL_BALANCE = ethers.parseEther('1000')

  async function deployFixture() {
    ;[owner, postman, depositor, blockedDepositor, nonPortDepositor, other] =
      await ethers.getSigners()

    // Deploy Poseidon libraries
    const PoseidonT3 = await ethers.getContractFactory('PoseidonT3')
    const poseidonT3 = await PoseidonT3.deploy()
    poseidonT3Address = await poseidonT3.getAddress()

    const PoseidonT4 = await ethers.getContractFactory('PoseidonT4')
    const poseidonT4 = await PoseidonT4.deploy()
    poseidonT4Address = await poseidonT4.getAddress()

    // Deploy mock contracts
    const MockVerifier = await ethers.getContractFactory('MockVerifier')
    mockVerifier = await MockVerifier.deploy()

    const MockRegistry = await ethers.getContractFactory('MockGaleonRegistry')
    mockRegistry = await MockRegistry.deploy()

    const MockERC20 = await ethers.getContractFactory('MockERC20')
    mockToken = await MockERC20.deploy('Test Token', 'TEST', 18)

    // Deploy Entrypoint as upgradeable proxy
    const Entrypoint = await ethers.getContractFactory('GaleonEntrypoint')
    entrypoint = (await upgrades.deployProxy(Entrypoint, [owner.address, postman.address], {
      kind: 'uups',
      unsafeAllow: ['constructor'],
    })) as unknown as GaleonEntrypoint

    // Deploy PrivacyPoolComplex with linked Poseidon libraries
    const PoolComplex = await ethers.getContractFactory('GaleonPrivacyPoolComplex', {
      libraries: {
        'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
        'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
      },
    })
    pool = (await upgrades.deployProxy(
      PoolComplex,
      [
        owner.address,
        await entrypoint.getAddress(),
        await mockVerifier.getAddress(),
        await mockVerifier.getAddress(),
        await mockRegistry.getAddress(),
      ],
      {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable', 'external-library-linking'],
        constructorArgs: [
          await entrypoint.getAddress(),
          await mockVerifier.getAddress(),
          await mockVerifier.getAddress(),
          await mockToken.getAddress(),
        ],
      }
    )) as unknown as GaleonPrivacyPoolComplex

    // Register pool in entrypoint
    await entrypoint
      .connect(owner)
      .registerPool(
        await mockToken.getAddress(),
        pool,
        MIN_DEPOSIT,
        VETTING_FEE_BPS,
        MAX_RELAY_FEE_BPS
      )

    // Add initial ASP root
    await entrypoint.connect(postman).updateRoot(12345n, VALID_CID)

    // Mark depositor as valid Port stealth address
    await mockRegistry.setPortStealthAddress(depositor.address, true)
    await mockRegistry.setPortStealthAddress(blockedDepositor.address, true)
    // nonPortDepositor is NOT set as valid Port address

    // Mint tokens to depositors
    await mockToken.mint(depositor.address, INITIAL_BALANCE)
    await mockToken.mint(blockedDepositor.address, INITIAL_BALANCE)
    await mockToken.mint(nonPortDepositor.address, INITIAL_BALANCE)

    // Approve entrypoint to spend tokens
    await mockToken.connect(depositor).approve(await entrypoint.getAddress(), ethers.MaxUint256)
    await mockToken
      .connect(blockedDepositor)
      .approve(await entrypoint.getAddress(), ethers.MaxUint256)
    await mockToken
      .connect(nonPortDepositor)
      .approve(await entrypoint.getAddress(), ethers.MaxUint256)

    // Authorize pool to consume verified balances
    await mockRegistry.setAuthorizedPool(await pool.getAddress(), true)

    // Set verified balances for depositors (using token address as asset for ERC20)
    const largeBalance = ethers.parseEther('1000')
    await mockRegistry.setVerifiedBalance(
      depositor.address,
      await mockToken.getAddress(),
      largeBalance
    )
    await mockRegistry.setVerifiedBalance(
      blockedDepositor.address,
      await mockToken.getAddress(),
      largeBalance
    )

    return {
      entrypoint,
      pool,
      mockVerifier,
      mockRegistry,
      mockToken,
      poseidonT3Address,
      poseidonT4Address,
    }
  }

  beforeEach(async function () {
    const fixtures = await loadFixture(deployFixture)
    entrypoint = fixtures.entrypoint
    pool = fixtures.pool
    mockVerifier = fixtures.mockVerifier
    mockRegistry = fixtures.mockRegistry
    mockToken = fixtures.mockToken
    poseidonT3Address = fixtures.poseidonT3Address
    poseidonT4Address = fixtures.poseidonT4Address
  })

  describe('Initialization', function () {
    it('Should initialize with correct owner', async function () {
      expect(await pool.owner()).to.equal(owner.address)
    })

    it('Should initialize with correct Galeon Registry', async function () {
      expect(await pool.galeonRegistry()).to.equal(await mockRegistry.getAddress())
    })

    it('Should initialize with correct entrypoint', async function () {
      expect(await pool.ENTRYPOINT()).to.equal(await entrypoint.getAddress())
    })

    it('Should initialize with correct asset', async function () {
      expect(await pool.ASSET()).to.equal(await mockToken.getAddress())
    })

    it('Should initialize with circuit version 1', async function () {
      expect(await pool.circuitVersion()).to.equal(1n)
    })

    it('Should not be dead initially', async function () {
      expect(await pool.dead()).to.be.false
    })
  })

  describe('ERC20 Deposits', function () {
    it('Should allow deposit from valid Port address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(depositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.emit(pool, 'Deposited')
    })

    it('Should transfer tokens correctly', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const balanceBefore = await mockToken.balanceOf(depositor.address)
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      const balanceAfter = await mockToken.balanceOf(depositor.address)

      expect(balanceBefore - balanceAfter).to.equal(depositAmount)
    })

    it('Should transfer correct amount to pool after fees', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const poolBalanceBefore = await mockToken.balanceOf(await pool.getAddress())
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      const poolBalanceAfter = await mockToken.balanceOf(await pool.getAddress())

      // Pool receives deposit minus vetting fee
      const expectedIncrease = depositAmount - (depositAmount * VETTING_FEE_BPS) / 10000n
      expect(poolBalanceAfter - poolBalanceBefore).to.equal(expectedIncrease)
    })

    it('Should reject deposit from non-Port address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(nonPortDepositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.be.revertedWithCustomError(pool, 'MustDepositFromPort')
    })

    it('Should reject native asset in ERC20 pool', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Try to send ETH along with ERC20 deposit - should fail
      // The entrypoint's deposit(IERC20,uint256,uint256) is not payable, so it reverts
      await expect(
        entrypoint
          .connect(depositor)
          [
            'deposit(address,uint256,uint256)'
          ](mockToken, depositAmount, precommitment, { value: 1 })
      ).to.be.reverted
    })
  })

  describe('Deposit Blocklist', function () {
    beforeEach(async function () {
      // Block the blockedDepositor
      await pool.connect(owner).updateBlocklist(blockedDepositor.address, true)
    })

    it('Should block deposits from blocklisted addresses', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(blockedDepositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.be.revertedWithCustomError(pool, 'DepositorBlocked')
    })

    it('Should allow deposits after removing from blocklist', async function () {
      await pool.connect(owner).updateBlocklist(blockedDepositor.address, false)

      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(blockedDepositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.emit(pool, 'Deposited')
    })

    it('Should emit DepositorBlocklistUpdated event', async function () {
      await expect(pool.connect(owner).updateBlocklist(other.address, true))
        .to.emit(pool, 'DepositorBlocklistUpdated')
        .withArgs(other.address, true)
    })

    it('Should revert if non-owner tries to update blocklist', async function () {
      await expect(
        pool.connect(other).updateBlocklist(depositor.address, true)
      ).to.be.revertedWithCustomError(pool, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Merkle Tree State', function () {
    it('Should update tree on deposit', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const sizeBefore = await pool.currentTreeSize()
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      const sizeAfter = await pool.currentTreeSize()

      expect(sizeAfter).to.equal(sizeBefore + 1n)
    })

    it('Should emit LeafInserted event', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(depositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.emit(pool, 'LeafInserted')
    })

    it('Should update current root', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const rootBefore = await pool.currentRoot()
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      const rootAfter = await pool.currentRoot()

      expect(rootAfter).to.not.equal(rootBefore)
    })
  })

  describe('Verifier Upgrades', function () {
    it('Should allow owner to upgrade verifiers', async function () {
      const MockVerifier = await ethers.getContractFactory('MockVerifier')
      const newVerifier = await MockVerifier.deploy()

      await expect(
        pool
          .connect(owner)
          .upgradeVerifiers(await newVerifier.getAddress(), await newVerifier.getAddress())
      )
        .to.emit(pool, 'VerifiersUpgraded')
        .withArgs(await newVerifier.getAddress(), await newVerifier.getAddress(), 2n)
    })

    it('Should increment circuit version', async function () {
      const MockVerifier = await ethers.getContractFactory('MockVerifier')
      const newVerifier = await MockVerifier.deploy()

      expect(await pool.circuitVersion()).to.equal(1n)
      await pool
        .connect(owner)
        .upgradeVerifiers(await newVerifier.getAddress(), await newVerifier.getAddress())
      expect(await pool.circuitVersion()).to.equal(2n)
    })

    it('Should revert if non-owner tries to upgrade', async function () {
      const MockVerifier = await ethers.getContractFactory('MockVerifier')
      const newVerifier = await MockVerifier.deploy()

      await expect(
        pool
          .connect(other)
          .upgradeVerifiers(await newVerifier.getAddress(), await newVerifier.getAddress())
      ).to.be.revertedWithCustomError(pool, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Galeon Registry Updates', function () {
    it('Should allow owner to set Galeon Registry', async function () {
      const MockRegistry = await ethers.getContractFactory('MockGaleonRegistry')
      const newRegistry = await MockRegistry.deploy()

      await expect(pool.connect(owner).setGaleonRegistry(await newRegistry.getAddress()))
        .to.emit(pool, 'GaleonRegistrySet')
        .withArgs(await newRegistry.getAddress())
    })

    it('Should update registry address', async function () {
      const MockRegistry = await ethers.getContractFactory('MockGaleonRegistry')
      const newRegistry = await MockRegistry.deploy()

      await pool.connect(owner).setGaleonRegistry(await newRegistry.getAddress())
      expect(await pool.galeonRegistry()).to.equal(await newRegistry.getAddress())
    })

    it('Should revert if non-owner tries to set registry', async function () {
      await expect(
        pool.connect(other).setGaleonRegistry(await mockRegistry.getAddress())
      ).to.be.revertedWithCustomError(pool, 'OwnableUnauthorizedAccount')
    })
  })

  describe('Wind Down', function () {
    it('Should allow entrypoint to wind down pool', async function () {
      await expect(entrypoint.connect(owner).windDownPool(pool)).to.emit(pool, 'PoolDied')
    })

    it('Should mark pool as dead', async function () {
      await entrypoint.connect(owner).windDownPool(pool)
      expect(await pool.dead()).to.be.true
    })

    it('Should reject deposits after wind down', async function () {
      await entrypoint.connect(owner).windDownPool(pool)

      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(depositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, precommitment)
      ).to.be.revertedWithCustomError(pool, 'PoolIsDead')
    })

    it('Should revert if non-entrypoint tries to wind down', async function () {
      await expect(pool.connect(owner).windDown()).to.be.revertedWithCustomError(
        pool,
        'OnlyEntrypoint'
      )
    })
  })

  describe('Multiple Deposits', function () {
    it('Should handle multiple deposits correctly', async function () {
      const depositAmount = ethers.parseEther('1')

      // Make multiple deposits
      for (let i = 1; i <= 5; i++) {
        await entrypoint
          .connect(depositor)
          ['deposit(address,uint256,uint256)'](mockToken, depositAmount, BigInt(i * 100))
      }

      // Verify state
      expect(await pool.nonce()).to.equal(5n)
      expect(await pool.currentTreeSize()).to.equal(5n)
    })

    it('Should maintain root history', async function () {
      const depositAmount = ethers.parseEther('1')

      // Make deposits
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, 100n)
      const root1 = await pool.currentRoot()

      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, 200n)
      const root2 = await pool.currentRoot()

      expect(root1).to.not.equal(root2)
    })
  })

  describe('UUPS Upgradeability', function () {
    it('Should allow owner to upgrade', async function () {
      const PoolComplexV2 = await ethers.getContractFactory('GaleonPrivacyPoolComplex', {
        libraries: {
          'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
          'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
        },
      })

      await expect(
        upgrades.upgradeProxy(await pool.getAddress(), PoolComplexV2, {
          kind: 'uups',
          unsafeAllow: ['constructor', 'state-variable-immutable', 'external-library-linking'],
          constructorArgs: [
            await entrypoint.getAddress(),
            await mockVerifier.getAddress(),
            await mockVerifier.getAddress(),
            await mockToken.getAddress(),
          ],
        })
      ).to.not.be.reverted
    })

    it('Should preserve state after upgrade', async function () {
      // Make a deposit first
      const depositAmount = ethers.parseEther('1')
      await entrypoint
        .connect(depositor)
        ['deposit(address,uint256,uint256)'](mockToken, depositAmount, 123n)

      const nonceBefore = await pool.nonce()
      const treeSizeBefore = await pool.currentTreeSize()
      const tokenBalanceBefore = await mockToken.balanceOf(await pool.getAddress())

      // Upgrade
      const PoolComplexV2 = await ethers.getContractFactory('GaleonPrivacyPoolComplex', {
        libraries: {
          'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
          'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
        },
      })
      await upgrades.upgradeProxy(await pool.getAddress(), PoolComplexV2, {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable', 'external-library-linking'],
        constructorArgs: [
          await entrypoint.getAddress(),
          await mockVerifier.getAddress(),
          await mockVerifier.getAddress(),
          await mockToken.getAddress(),
        ],
      })

      // Check state preserved
      expect(await pool.nonce()).to.equal(nonceBefore)
      expect(await pool.currentTreeSize()).to.equal(treeSizeBefore)
      expect(await mockToken.balanceOf(await pool.getAddress())).to.equal(tokenBalanceBefore)
    })
  })
})
