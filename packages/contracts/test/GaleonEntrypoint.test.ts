import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import type { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'
import type {
  GaleonEntrypoint,
  GaleonPrivacyPoolSimple,
  MockVerifier,
  MockGaleonRegistry,
} from '../typechain-types'

describe('GaleonEntrypoint', function () {
  // Test accounts
  let owner: HardhatEthersSigner
  let postman: HardhatEthersSigner
  let depositor: HardhatEthersSigner
  let other: HardhatEthersSigner

  // Contract instances
  let entrypoint: GaleonEntrypoint
  let pool: GaleonPrivacyPoolSimple
  let mockVerifier: MockVerifier
  let mockRegistry: MockGaleonRegistry

  // Constants
  const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  const MIN_DEPOSIT = ethers.parseEther('0.01')
  const VETTING_FEE_BPS = 100n // 1%
  const MAX_RELAY_FEE_BPS = 200n // 2%

  async function deployFixture() {
    ;[owner, postman, depositor, other] = await ethers.getSigners()

    // Deploy Poseidon libraries
    const PoseidonT3 = await ethers.getContractFactory('PoseidonT3')
    const poseidonT3 = await PoseidonT3.deploy()

    const PoseidonT4 = await ethers.getContractFactory('PoseidonT4')
    const poseidonT4 = await PoseidonT4.deploy()

    // Deploy mock contracts
    const MockVerifier = await ethers.getContractFactory('MockVerifier')
    mockVerifier = await MockVerifier.deploy()

    const MockRegistry = await ethers.getContractFactory('MockGaleonRegistry')
    mockRegistry = await MockRegistry.deploy()

    // Deploy Entrypoint as upgradeable proxy
    const Entrypoint = await ethers.getContractFactory('GaleonEntrypoint')
    entrypoint = (await upgrades.deployProxy(Entrypoint, [owner.address, postman.address], {
      kind: 'uups',
      unsafeAllow: ['constructor'],
    })) as unknown as GaleonEntrypoint

    // Deploy PrivacyPoolSimple with linked Poseidon libraries
    const PoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
      libraries: {
        'poseidon-solidity/PoseidonT3.sol:PoseidonT3': await poseidonT3.getAddress(),
        'poseidon-solidity/PoseidonT4.sol:PoseidonT4': await poseidonT4.getAddress(),
      },
    })

    // Deploy pool as upgradeable proxy
    pool = (await upgrades.deployProxy(
      PoolSimple,
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
        ],
      }
    )) as unknown as GaleonPrivacyPoolSimple

    // Mark depositor as valid Port stealth address
    await mockRegistry.setPortStealthAddress(depositor.address, true)

    // Authorize pool to consume verified balances
    await mockRegistry.setAuthorizedPool(await pool.getAddress(), true)

    // Set verified balance for depositor (using address(0) for native asset)
    const largeBalance = ethers.parseEther('1000')
    await mockRegistry.setVerifiedBalance(depositor.address, ethers.ZeroAddress, largeBalance)

    return { entrypoint, pool, mockVerifier, mockRegistry, poseidonT3, poseidonT4 }
  }

  beforeEach(async function () {
    const fixtures = await loadFixture(deployFixture)
    entrypoint = fixtures.entrypoint
    pool = fixtures.pool
    mockVerifier = fixtures.mockVerifier
    mockRegistry = fixtures.mockRegistry
  })

  describe('Initialization', function () {
    it('Should initialize with correct owner', async function () {
      const OWNER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OWNER_ROLE'))
      expect(await entrypoint.hasRole(OWNER_ROLE, owner.address)).to.be.true
    })

    it('Should initialize with correct postman', async function () {
      const ASP_POSTMAN = ethers.keccak256(ethers.toUtf8Bytes('ASP_POSTMAN'))
      expect(await entrypoint.hasRole(ASP_POSTMAN, postman.address)).to.be.true
    })

    it('Should revert if owner is zero address', async function () {
      const Entrypoint = await ethers.getContractFactory('GaleonEntrypoint')
      await expect(
        upgrades.deployProxy(Entrypoint, [ethers.ZeroAddress, postman.address], {
          kind: 'uups',
          unsafeAllow: ['constructor'],
        })
      ).to.be.revertedWithCustomError(entrypoint, 'ZeroAddress')
    })

    it('Should revert if postman is zero address', async function () {
      const Entrypoint = await ethers.getContractFactory('GaleonEntrypoint')
      await expect(
        upgrades.deployProxy(Entrypoint, [owner.address, ethers.ZeroAddress], {
          kind: 'uups',
          unsafeAllow: ['constructor'],
        })
      ).to.be.revertedWithCustomError(entrypoint, 'ZeroAddress')
    })
  })

  describe('ASP Root Management', function () {
    const testRoot = 12345n
    const validCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG' // 46 chars

    it('Should allow postman to update root', async function () {
      const tx = await entrypoint.connect(postman).updateRoot(testRoot, validCID)
      const receipt = await tx.wait()
      const block = await ethers.provider.getBlock(receipt!.blockNumber)

      await expect(tx)
        .to.emit(entrypoint, 'RootUpdated')
        .withArgs(testRoot, validCID, block!.timestamp)
    })

    it('Should store the root correctly', async function () {
      await entrypoint.connect(postman).updateRoot(testRoot, validCID)
      expect(await entrypoint.latestRoot()).to.equal(testRoot)
    })

    it('Should increment index with each update', async function () {
      const root1 = 111n
      const root2 = 222n

      const idx1 = await entrypoint.connect(postman).updateRoot.staticCall(root1, validCID)
      await entrypoint.connect(postman).updateRoot(root1, validCID)

      const idx2 = await entrypoint.connect(postman).updateRoot.staticCall(root2, validCID)
      await entrypoint.connect(postman).updateRoot(root2, validCID)

      expect(idx1).to.equal(0n)
      expect(idx2).to.equal(1n)
    })

    it('Should revert if non-postman tries to update root', async function () {
      await expect(entrypoint.connect(other).updateRoot(testRoot, validCID)).to.be.reverted
    })

    it('Should revert if root is zero', async function () {
      await expect(
        entrypoint.connect(postman).updateRoot(0, validCID)
      ).to.be.revertedWithCustomError(entrypoint, 'EmptyRoot')
    })

    it('Should revert if CID is too short', async function () {
      await expect(
        entrypoint.connect(postman).updateRoot(testRoot, 'short')
      ).to.be.revertedWithCustomError(entrypoint, 'InvalidIPFSCIDLength')
    })

    it('Should revert if CID is too long', async function () {
      const longCID = 'Q'.repeat(65)
      await expect(
        entrypoint.connect(postman).updateRoot(testRoot, longCID)
      ).to.be.revertedWithCustomError(entrypoint, 'InvalidIPFSCIDLength')
    })

    it('Should return root by index', async function () {
      await entrypoint.connect(postman).updateRoot(testRoot, validCID)
      expect(await entrypoint.rootByIndex(0)).to.equal(testRoot)
    })

    it('Should revert if accessing invalid index', async function () {
      await expect(entrypoint.rootByIndex(999)).to.be.revertedWithCustomError(
        entrypoint,
        'InvalidIndex'
      )
    })

    it('Should revert if no roots available', async function () {
      await expect(entrypoint.latestRoot()).to.be.revertedWithCustomError(
        entrypoint,
        'NoRootsAvailable'
      )
    })
  })

  describe('Pool Registration', function () {
    it('Should allow owner to register a pool', async function () {
      const scope = await pool.SCOPE()
      await expect(
        entrypoint
          .connect(owner)
          .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
      )
        .to.emit(entrypoint, 'PoolRegistered')
        .withArgs(await pool.getAddress(), NATIVE_ASSET, scope)
    })

    it('Should store pool configuration correctly', async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

      const config = await entrypoint.assetConfig(NATIVE_ASSET)
      expect(config[0]).to.equal(await pool.getAddress()) // pool
      expect(config[1]).to.equal(MIN_DEPOSIT) // minimumDepositAmount
      expect(config[2]).to.equal(VETTING_FEE_BPS) // vettingFeeBPS
      expect(config[3]).to.equal(MAX_RELAY_FEE_BPS) // maxRelayFeeBPS
    })

    it('Should map scope to pool', async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

      const scope = await pool.SCOPE()
      expect(await entrypoint.scopeToPool(scope)).to.equal(await pool.getAddress())
    })

    it('Should revert if non-owner tries to register', async function () {
      await expect(
        entrypoint
          .connect(other)
          .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
      ).to.be.reverted
    })

    it('Should revert if asset is zero address', async function () {
      await expect(
        entrypoint
          .connect(owner)
          .registerPool(ethers.ZeroAddress, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
      ).to.be.revertedWithCustomError(entrypoint, 'ZeroAddress')
    })

    it('Should revert if pool is zero address', async function () {
      await expect(
        entrypoint
          .connect(owner)
          .registerPool(
            NATIVE_ASSET,
            ethers.ZeroAddress,
            MIN_DEPOSIT,
            VETTING_FEE_BPS,
            MAX_RELAY_FEE_BPS
          )
      ).to.be.revertedWithCustomError(entrypoint, 'ZeroAddress')
    })

    it('Should revert if asset already registered', async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

      await expect(
        entrypoint
          .connect(owner)
          .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
      ).to.be.revertedWithCustomError(entrypoint, 'AssetPoolAlreadyRegistered')
    })

    it('Should revert if fee is >= 100%', async function () {
      await expect(
        entrypoint
          .connect(owner)
          .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, 10000n, MAX_RELAY_FEE_BPS)
      ).to.be.revertedWithCustomError(entrypoint, 'InvalidFeeBPS')
    })
  })

  describe('Pool Removal', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
    })

    it('Should allow owner to remove a pool', async function () {
      const scope = await pool.SCOPE()
      await expect(entrypoint.connect(owner).removePool(NATIVE_ASSET))
        .to.emit(entrypoint, 'PoolRemoved')
        .withArgs(await pool.getAddress(), NATIVE_ASSET, scope)
    })

    it('Should clear pool configuration', async function () {
      await entrypoint.connect(owner).removePool(NATIVE_ASSET)
      const config = await entrypoint.assetConfig(NATIVE_ASSET)
      expect(config[0]).to.equal(ethers.ZeroAddress)
    })

    it('Should revert if non-owner tries to remove', async function () {
      await expect(entrypoint.connect(other).removePool(NATIVE_ASSET)).to.be.reverted
    })

    it('Should revert if pool not found', async function () {
      await expect(
        entrypoint.connect(owner).removePool(other.address)
      ).to.be.revertedWithCustomError(entrypoint, 'PoolNotFound')
    })
  })

  describe('Pool Configuration Update', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
    })

    it('Should allow owner to update configuration', async function () {
      const newMin = ethers.parseEther('0.1')
      const newVetting = 200n
      const newRelay = 300n

      await expect(
        entrypoint
          .connect(owner)
          .updatePoolConfiguration(NATIVE_ASSET, newMin, newVetting, newRelay)
      )
        .to.emit(entrypoint, 'PoolConfigurationUpdated')
        .withArgs(await pool.getAddress(), NATIVE_ASSET, newMin, newVetting, newRelay)

      const config = await entrypoint.assetConfig(NATIVE_ASSET)
      expect(config[1]).to.equal(newMin)
      expect(config[2]).to.equal(newVetting)
      expect(config[3]).to.equal(newRelay)
    })

    it('Should revert if pool not found', async function () {
      await expect(
        entrypoint
          .connect(owner)
          .updatePoolConfiguration(other.address, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
      ).to.be.revertedWithCustomError(entrypoint, 'PoolNotFound')
    })
  })

  describe('Native Asset Deposits', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

      // Add initial ASP root
      const validCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      await entrypoint.connect(postman).updateRoot(12345n, validCID)
    })

    it('Should allow deposit from valid Port address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(entrypoint, 'Deposited')
    })

    it('Should deduct vetting fee', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // 1% fee = 0.01 ETH, so 0.99 ETH goes to pool
      const expectedAfterFees = depositAmount - (depositAmount * VETTING_FEE_BPS) / 10000n

      // Check pool receives correct amount
      const poolBalanceBefore = await ethers.provider.getBalance(await pool.getAddress())
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })
      const poolBalanceAfter = await ethers.provider.getBalance(await pool.getAddress())

      expect(poolBalanceAfter - poolBalanceBefore).to.equal(expectedAfterFees)
    })

    it('Should revert if below minimum deposit', async function () {
      const smallDeposit = ethers.parseEther('0.001')
      const precommitment = 123456n

      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: smallDeposit })
      ).to.be.revertedWithCustomError(entrypoint, 'MinimumDepositAmount')
    })

    it('Should revert if precommitment already used', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })

      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(entrypoint, 'PrecommitmentAlreadyUsed')
    })

    it('Should mark precommitment as used', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      expect(await entrypoint.usedPrecommitments(precommitment)).to.be.false
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })
      expect(await entrypoint.usedPrecommitments(precommitment)).to.be.true
    })
  })

  describe('Pool Wind Down', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
    })

    it('Should allow owner to wind down pool', async function () {
      await expect(entrypoint.connect(owner).windDownPool(pool))
        .to.emit(entrypoint, 'PoolWindDown')
        .withArgs(await pool.getAddress())
    })

    it('Should mark pool as dead', async function () {
      await entrypoint.connect(owner).windDownPool(pool)
      expect(await pool.dead()).to.be.true
    })

    it('Should revert if non-owner tries to wind down', async function () {
      await expect(entrypoint.connect(other).windDownPool(pool)).to.be.reverted
    })
  })

  describe('Fee Withdrawal', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

      // Add ASP root
      const validCID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'
      await entrypoint.connect(postman).updateRoot(12345n, validCID)

      // Make deposits to generate fees
      const depositAmount = ethers.parseEther('1')
      await entrypoint.connect(depositor)['deposit(uint256)'](111n, { value: depositAmount })
      await entrypoint.connect(depositor)['deposit(uint256)'](222n, { value: depositAmount })
    })

    it('Should allow owner to withdraw fees', async function () {
      const feeBalance = await ethers.provider.getBalance(await entrypoint.getAddress())
      const recipientBefore = await ethers.provider.getBalance(other.address)

      await entrypoint.connect(owner).withdrawFees(NATIVE_ASSET, other.address)

      const recipientAfter = await ethers.provider.getBalance(other.address)
      expect(recipientAfter - recipientBefore).to.equal(feeBalance)
    })

    it('Should emit FeesWithdrawn event', async function () {
      const feeBalance = await ethers.provider.getBalance(await entrypoint.getAddress())

      await expect(entrypoint.connect(owner).withdrawFees(NATIVE_ASSET, other.address))
        .to.emit(entrypoint, 'FeesWithdrawn')
        .withArgs(NATIVE_ASSET, other.address, feeBalance)
    })

    it('Should revert if non-owner tries to withdraw', async function () {
      await expect(entrypoint.connect(other).withdrawFees(NATIVE_ASSET, other.address)).to.be
        .reverted
    })

    it('Should revert if recipient is zero address', async function () {
      await expect(
        entrypoint.connect(owner).withdrawFees(NATIVE_ASSET, ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(entrypoint, 'ZeroAddress')
    })
  })

  describe('Receive Function', function () {
    beforeEach(async function () {
      await entrypoint
        .connect(owner)
        .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)
    })

    it('Should reject native asset from non-pool addresses', async function () {
      await expect(
        other.sendTransaction({ to: await entrypoint.getAddress(), value: ethers.parseEther('1') })
      ).to.be.revertedWithCustomError(entrypoint, 'NativeAssetNotAccepted')
    })
  })
})
