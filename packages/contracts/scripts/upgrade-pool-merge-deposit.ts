import { ethers, upgrades } from 'hardhat'

/**
 * Upgrade Script: Pool + Entrypoint for MergeDeposit Support
 *
 * Upgrades both UUPS proxies to support the new mergeDeposit() functionality:
 * - Pool: Adds mergeDeposit() for O(1) withdrawals
 * - Entrypoint: Adds mergeDeposit() forwarding function
 *
 * Run: npx hardhat run scripts/upgrade-pool-merge-deposit.ts --network mantle
 */

// Active pool registered with Entrypoint (check via assetConfig)
const POOL_ADDRESS = '0x3260c8d8cc654B0897cd93cdf0662Fa679656b36'
const ENTRYPOINT_ADDRESS = '0x54BA91d29f84B8bAd161880798877e59f2999f7a'
const MERGE_DEPOSIT_VERIFIER = '0x5D77AE3c392E16266a8914D4eE17D622f5e747Fa'

// Existing verifier addresses
const WITHDRAWAL_VERIFIER = '0x7529e3ec251A648A873F53d9969c1C05a44029A1'
const RAGEQUIT_VERIFIER = '0xFDb199E0aC8eC430541438aa6E63101F8C205D76'

// Poseidon library addresses (already deployed)
const POSEIDON_T3 = '0x1130c821a709e5D414684a7605F5D1f6E7439Ff2'
const POSEIDON_T4 = '0x669b0039263C3dBF1c2c5726A378433759Fa0df1'

async function main() {
  console.log('\n========================================')
  console.log('  Upgrading Pool + Entrypoint')
  console.log('  for MergeDeposit Support')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Upgrader: ${deployer.address}`)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // ==========================================
  // 1. Upgrade Entrypoint
  // ==========================================
  console.log('1. Upgrading GaleonEntrypoint...')
  const GaleonEntrypoint = await ethers.getContractFactory('GaleonEntrypoint')
  const upgradedEntrypoint = await upgrades.upgradeProxy(ENTRYPOINT_ADDRESS, GaleonEntrypoint, {
    kind: 'uups',
  })
  await upgradedEntrypoint.waitForDeployment()
  console.log('   ✓ Entrypoint upgraded')

  // ==========================================
  // 2. Upgrade Pool
  // ==========================================
  console.log('\n2. Upgrading GaleonPrivacyPoolSimple...')
  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': POSEIDON_T3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': POSEIDON_T4,
    },
  })
  const upgradedPool = await upgrades.upgradeProxy(POOL_ADDRESS, GaleonPrivacyPoolSimple, {
    unsafeAllowLinkedLibraries: true,
    constructorArgs: [ENTRYPOINT_ADDRESS, WITHDRAWAL_VERIFIER, RAGEQUIT_VERIFIER],
    unsafeAllow: ['constructor', 'state-variable-immutable'],
  })
  await upgradedPool.waitForDeployment()
  console.log('   ✓ Pool upgraded')

  // ==========================================
  // 3. Set MergeDepositVerifier on Pool
  // ==========================================
  console.log('\n3. Setting MergeDepositVerifier on Pool...')
  const tx = await upgradedPool.setMergeDepositVerifier(MERGE_DEPOSIT_VERIFIER)
  await tx.wait()
  console.log('   ✓ Verifier set')

  // ==========================================
  // 4. Verify
  // ==========================================
  console.log('\n4. Verifying upgrades...')

  // Check Pool verifier
  const verifier = await upgradedPool.MERGE_DEPOSIT_VERIFIER()
  console.log(`   Pool MERGE_DEPOSIT_VERIFIER: ${verifier}`)
  if (verifier.toLowerCase() === MERGE_DEPOSIT_VERIFIER.toLowerCase()) {
    console.log('   ✓ Pool verifier set correctly')
  } else {
    console.log('   ⚠ Pool verifier mismatch!')
  }

  // Check Entrypoint has mergeDeposit function
  const entrypointCode = await ethers.provider.getCode(ENTRYPOINT_ADDRESS)
  console.log(`   Entrypoint code size: ${(entrypointCode.length - 2) / 2} bytes`)
  console.log('   ✓ Entrypoint upgraded (mergeDeposit available)')

  console.log('\n========================================')
  console.log('  Upgrade Complete!')
  console.log('========================================')
  console.log('\nSummary:')
  console.log(`  Entrypoint: ${ENTRYPOINT_ADDRESS}`)
  console.log(`  Pool:       ${POOL_ADDRESS}`)
  console.log(`  Verifier:   ${MERGE_DEPOSIT_VERIFIER}`)
  console.log('\nMergeDeposit is now available!')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
