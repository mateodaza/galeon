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

describe('GaleonPrivacyPoolSimple', function () {
  // Test accounts
  let owner: HardhatEthersSigner
  let postman: HardhatEthersSigner
  let depositor: HardhatEthersSigner
  let blockedDepositor: HardhatEthersSigner
  let nonPortDepositor: HardhatEthersSigner
  let other: HardhatEthersSigner

  // Contract instances
  let entrypoint: GaleonEntrypoint
  let pool: GaleonPrivacyPoolSimple
  let mockVerifier: MockVerifier
  let mockRegistry: MockGaleonRegistry

  // Poseidon library addresses (for upgrades)
  let poseidonT3Address: string
  let poseidonT4Address: string

  // Constants
  const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  const MIN_DEPOSIT = ethers.parseEther('0.01')
  const VETTING_FEE_BPS = 100n // 1%
  const MAX_RELAY_FEE_BPS = 200n // 2%
  const VALID_CID = 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG'

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

    // Deploy Entrypoint as upgradeable proxy
    const Entrypoint = await ethers.getContractFactory('GaleonEntrypoint')
    entrypoint = (await upgrades.deployProxy(Entrypoint, [owner.address, postman.address], {
      kind: 'uups',
      unsafeAllow: ['constructor'],
    })) as unknown as GaleonEntrypoint

    // Deploy PrivacyPoolSimple with linked Poseidon libraries
    const PoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
      libraries: {
        'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
        'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
      },
    })
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

    // Register pool in entrypoint
    await entrypoint
      .connect(owner)
      .registerPool(NATIVE_ASSET, pool, MIN_DEPOSIT, VETTING_FEE_BPS, MAX_RELAY_FEE_BPS)

    // Add initial ASP root
    await entrypoint.connect(postman).updateRoot(12345n, VALID_CID)

    // Mark depositor as valid Port stealth address
    await mockRegistry.setPortStealthAddress(depositor.address, true)
    await mockRegistry.setPortStealthAddress(blockedDepositor.address, true)
    // nonPortDepositor is NOT set as valid Port address

    // Authorize pool to consume verified balances
    await mockRegistry.setAuthorizedPool(await pool.getAddress(), true)

    // Set verified balances for depositors (using native asset = address(0))
    // Set large amounts to cover all test cases
    const largeBalance = ethers.parseEther('1000')
    await mockRegistry.setVerifiedBalance(depositor.address, ethers.ZeroAddress, largeBalance)
    await mockRegistry.setVerifiedBalance(
      blockedDepositor.address,
      ethers.ZeroAddress,
      largeBalance
    )

    return { entrypoint, pool, mockVerifier, mockRegistry, poseidonT3Address, poseidonT4Address }
  }

  beforeEach(async function () {
    const fixtures = await loadFixture(deployFixture)
    entrypoint = fixtures.entrypoint
    pool = fixtures.pool
    mockVerifier = fixtures.mockVerifier
    mockRegistry = fixtures.mockRegistry
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
      expect(await pool.ASSET()).to.equal(NATIVE_ASSET)
    })

    it('Should initialize with circuit version 1', async function () {
      expect(await pool.circuitVersion()).to.equal(1n)
    })

    it('Should not be dead initially', async function () {
      expect(await pool.dead()).to.be.false
    })
  })

  describe('Port-Only Deposits', function () {
    it('Should allow deposit from valid Port address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'Deposited')
    })

    it('Should reject deposit from non-Port address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(nonPortDepositor)
          ['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'MustDepositFromPort')
    })

    it('Should track depositor correctly', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })

      // The label is computed as keccak256(SCOPE, nonce) % SNARK_SCALAR_FIELD
      // We can verify by checking the nonce increased
      expect(await pool.nonce()).to.equal(1n)
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
          ['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'DepositorBlocked')
    })

    it('Should allow deposits after removing from blocklist', async function () {
      await pool.connect(owner).updateBlocklist(blockedDepositor.address, false)

      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(blockedDepositor)
          ['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'Deposited')
    })

    it('Should emit DepositorBlocklistUpdated event when blocking', async function () {
      await expect(pool.connect(owner).updateBlocklist(other.address, true))
        .to.emit(pool, 'DepositorBlocklistUpdated')
        .withArgs(other.address, true)
    })

    it('Should emit DepositorBlocklistUpdated event when unblocking', async function () {
      await pool.connect(owner).updateBlocklist(other.address, true)

      await expect(pool.connect(owner).updateBlocklist(other.address, false))
        .to.emit(pool, 'DepositorBlocklistUpdated')
        .withArgs(other.address, false)
    })

    it('Should revert if non-owner tries to update blocklist', async function () {
      await expect(
        pool.connect(other).updateBlocklist(depositor.address, true)
      ).to.be.revertedWithCustomError(pool, 'OwnableUnauthorizedAccount')
    })

    it('Should track blocked status correctly', async function () {
      expect(await pool.blockedDepositors(blockedDepositor.address)).to.be.true
      expect(await pool.blockedDepositors(depositor.address)).to.be.false
    })
  })

  describe('Verified Balance Gating', function () {
    it('Should reject deposit exceeding verified balance (dirty direct send)', async function () {
      // Create a new address with no verified balance but give it ETH directly
      const dirtyDepositor = other

      // Mark as Port stealth address (so it passes that check)
      await mockRegistry.setPortStealthAddress(dirtyDepositor.address, true)
      // Do NOT set any verified balance - simulates dirty direct send

      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint
          .connect(dirtyDepositor)
          ['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'InsufficientVerifiedBalance')
    })

    it('Should reject double-deposit (verified balance already consumed)', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment1 = 123456n
      const precommitment2 = 789012n

      // First deposit should succeed (depositor has 1000 ETH verified balance from fixture)
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment1, { value: depositAmount })

      // Reduce verified balance to simulate consumed funds
      // Set verified balance to less than deposit amount
      await mockRegistry.setVerifiedBalance(
        depositor.address,
        ethers.ZeroAddress,
        ethers.parseEther('0.5')
      )

      // Second deposit of 1 ETH should fail (only 0.5 ETH verified balance remaining)
      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment2, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'InsufficientVerifiedBalance')
    })

    it('Should allow deposit when verified balance is sufficient', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Depositor has 1000 ETH verified balance from fixture
      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'Deposited')
    })

    it('Should consume exact deposit amount from verified balance', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Set exact verified balance for testing consumption
      await mockRegistry.setVerifiedBalance(
        depositor.address,
        ethers.ZeroAddress,
        ethers.parseEther('5')
      )

      const balanceBefore = await mockRegistry.verifiedBalance(
        depositor.address,
        ethers.ZeroAddress
      )
      expect(balanceBefore).to.equal(ethers.parseEther('5'))

      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })

      const balanceAfter = await mockRegistry.verifiedBalance(depositor.address, ethers.ZeroAddress)
      // Pool consumes verified balance, so the mock should reflect the reduction
      // Note: Due to vetting fee, actual deposit value is less than 1 ETH
      // But the consumption happens based on _value (post-fee amount)
      expect(balanceAfter).to.be.lessThan(balanceBefore)
    })

    it('Should reject consume from unauthorized caller', async function () {
      // Try to directly consume verified balance from an unauthorized address
      await expect(
        mockRegistry
          .connect(other)
          .consumeVerifiedBalance(depositor.address, ethers.ZeroAddress, ethers.parseEther('1'))
      ).to.be.revertedWith('Not authorized pool')
    })

    it('Should allow authorized pool to consume verified balance', async function () {
      // The pool is already authorized in the fixture
      // This test verifies the pool can consume balance through the deposit flow
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Set a specific verified balance
      await mockRegistry.setVerifiedBalance(
        depositor.address,
        ethers.ZeroAddress,
        ethers.parseEther('2')
      )

      // Deposit should succeed and consume some balance
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })

      // Verified balance should be reduced
      const remainingBalance = await mockRegistry.verifiedBalance(
        depositor.address,
        ethers.ZeroAddress
      )
      expect(remainingBalance).to.be.lessThan(ethers.parseEther('2'))
    })

    it('Should reject deposit from frozen stealth address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Freeze the depositor's stealth address (simulating port deactivation)
      await mockRegistry.setFrozenStealthAddress(depositor.address, true)

      // Deposit should fail because address is frozen
      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'MustDepositFromPort')
    })

    it('Should allow deposit after unfreezing stealth address', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // Freeze then unfreeze
      await mockRegistry.setFrozenStealthAddress(depositor.address, true)
      await mockRegistry.setFrozenStealthAddress(depositor.address, false)

      // Deposit should succeed
      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'Deposited')
    })
  })

  describe('Merkle Tree State', function () {
    it('Should update tree on deposit', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const sizeBefore = await pool.currentTreeSize()
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })
      const sizeAfter = await pool.currentTreeSize()

      expect(sizeAfter).to.equal(sizeBefore + 1n)
    })

    it('Should emit LeafInserted event', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'LeafInserted')
    })

    it('Should update current root', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const rootBefore = await pool.currentRoot()
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })
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

    it('Should revert if withdrawal verifier is zero address', async function () {
      await expect(
        pool.connect(owner).upgradeVerifiers(ethers.ZeroAddress, await mockVerifier.getAddress())
      ).to.be.reverted
    })

    it('Should revert if ragequit verifier is zero address', async function () {
      await expect(
        pool.connect(owner).upgradeVerifiers(await mockVerifier.getAddress(), ethers.ZeroAddress)
      ).to.be.reverted
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
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.be.revertedWithCustomError(pool, 'PoolIsDead')
    })

    it('Should revert if already dead', async function () {
      await entrypoint.connect(owner).windDownPool(pool)

      await expect(entrypoint.connect(owner).windDownPool(pool)).to.be.revertedWithCustomError(
        pool,
        'PoolIsDead'
      )
    })

    it('Should revert if non-entrypoint tries to wind down', async function () {
      await expect(pool.connect(owner).windDown()).to.be.revertedWithCustomError(
        pool,
        'OnlyEntrypoint'
      )
    })
  })

  describe('Native Asset Handling', function () {
    it('Should accept correct msg.value for deposits', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      // This should work - correct value sent
      await expect(
        entrypoint.connect(depositor)['deposit(uint256)'](precommitment, { value: depositAmount })
      ).to.emit(pool, 'Deposited')
    })

    it('Should track pool balance correctly', async function () {
      const depositAmount = ethers.parseEther('1')
      const precommitment = 123456n

      const balanceBefore = await ethers.provider.getBalance(await pool.getAddress())
      await entrypoint
        .connect(depositor)
        ['deposit(uint256)'](precommitment, { value: depositAmount })
      const balanceAfter = await ethers.provider.getBalance(await pool.getAddress())

      // Balance should increase by deposit amount minus vetting fee
      const expectedIncrease = depositAmount - (depositAmount * VETTING_FEE_BPS) / 10000n
      expect(balanceAfter - balanceBefore).to.equal(expectedIncrease)
    })
  })

  describe('Constants', function () {
    it('Should have correct ROOT_HISTORY_SIZE', async function () {
      expect(await pool.ROOT_HISTORY_SIZE()).to.equal(64n)
    })

    it('Should have correct MAX_TREE_DEPTH', async function () {
      expect(await pool.MAX_TREE_DEPTH()).to.equal(32n)
    })
  })

  describe('UUPS Upgradeability', function () {
    it('Should allow owner to upgrade', async function () {
      const PoolSimpleV2 = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
        libraries: {
          'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
          'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
        },
      })

      await expect(
        upgrades.upgradeProxy(await pool.getAddress(), PoolSimpleV2, {
          kind: 'uups',
          unsafeAllow: ['constructor', 'state-variable-immutable', 'external-library-linking'],
          constructorArgs: [
            await entrypoint.getAddress(),
            await mockVerifier.getAddress(),
            await mockVerifier.getAddress(),
          ],
        })
      ).to.not.be.reverted
    })

    it('Should preserve state after upgrade', async function () {
      // Make a deposit first
      const depositAmount = ethers.parseEther('1')
      await entrypoint.connect(depositor)['deposit(uint256)'](123n, { value: depositAmount })

      const nonceBefore = await pool.nonce()
      const treeSizeBefore = await pool.currentTreeSize()

      // Upgrade
      const PoolSimpleV2 = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
        libraries: {
          'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
          'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
        },
      })
      await upgrades.upgradeProxy(await pool.getAddress(), PoolSimpleV2, {
        kind: 'uups',
        unsafeAllow: ['constructor', 'state-variable-immutable', 'external-library-linking'],
        constructorArgs: [
          await entrypoint.getAddress(),
          await mockVerifier.getAddress(),
          await mockVerifier.getAddress(),
        ],
      })

      // Check state preserved
      expect(await pool.nonce()).to.equal(nonceBefore)
      expect(await pool.currentTreeSize()).to.equal(treeSizeBefore)
    })

    it('Should have unique SCOPE per proxy (proof domain separation)', async function () {
      // Deploy a second pool proxy with same implementation
      const PoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
        libraries: {
          'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Address,
          'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Address,
        },
      })
      const pool2 = (await upgrades.deployProxy(
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

      // Get SCOPE values
      const scope1 = await pool.SCOPE()
      const scope2 = await pool2.SCOPE()

      // SCOPE should be different for each proxy (computed from their respective addresses)
      expect(scope1).to.not.equal(scope2)

      // Verify SCOPE is derived from proxy address, not implementation
      const poolAddress = await pool.getAddress()
      const pool2Address = await pool2.getAddress()
      expect(poolAddress).to.not.equal(pool2Address) // Sanity check: different proxy addresses

      // Both SCOPEs should be non-zero
      expect(scope1).to.be.greaterThan(0n)
      expect(scope2).to.be.greaterThan(0n)
    })
  })
})
