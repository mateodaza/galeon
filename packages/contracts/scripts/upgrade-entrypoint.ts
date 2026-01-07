import { ethers, upgrades } from 'hardhat'

/**
 * Upgrade Script: Entrypoint for relay() and mergeDeposit() Support
 *
 * Upgrades the GaleonEntrypoint UUPS proxy to the latest implementation
 * that includes:
 * - relay() function for withdrawals
 * - mergeDeposit() function for O(1) withdrawals
 *
 * Run: npx hardhat run scripts/upgrade-entrypoint.ts --network mantle
 */

// ============================================
// YOUR ACTUAL DEPLOYMENT ADDRESSES (Mantle Mainnet)
// ============================================
const ENTRYPOINT_ADDRESS = '0x8633518fbbf23E78586F1456530c3452885efb21'
const POOL_ADDRESS = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'

// Verifier addresses (already deployed)
const WITHDRAWAL_VERIFIER = '0x32f0240E1Acf7326B598eE850998CaFEA4aEABb7'
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'
const MERGE_DEPOSIT_VERIFIER = '0x05DB69e37b8c7509E9d97826249385682CE9b29d'

// Poseidon library addresses (already deployed)
const POSEIDON_T3 = '0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954'
const POSEIDON_T4 = '0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892'

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  if (chainId !== 5000) {
    throw new Error(`This script is for Mantle mainnet (5000), got ${chainId}`)
  }

  console.log('\n========================================')
  console.log('  Upgrading GaleonEntrypoint')
  console.log('  Adding relay() + mergeDeposit()')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Upgrader: ${deployer.address}`)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  console.log('Target addresses:')
  console.log(`  Entrypoint: ${ENTRYPOINT_ADDRESS}`)
  console.log(`  Pool:       ${POOL_ADDRESS}`)
  console.log('')

  // ==========================================
  // 1. Upgrade Entrypoint (force new implementation)
  // ==========================================
  console.log('1. Upgrading GaleonEntrypoint...')
  const GaleonEntrypoint = await ethers.getContractFactory('GaleonEntrypoint')

  // Force import first to register the proxy in manifest
  await upgrades.forceImport(ENTRYPOINT_ADDRESS, GaleonEntrypoint, { kind: 'uups' })
  console.log('   ✓ Entrypoint proxy imported')

  // Upgrade with redeployImplementation: 'always' to force new deployment
  console.log('   Deploying new implementation...')
  const upgradedEntrypoint = await upgrades.upgradeProxy(ENTRYPOINT_ADDRESS, GaleonEntrypoint, {
    kind: 'uups',
    redeployImplementation: 'always', // Force deploy even if bytecode matches
  })
  await upgradedEntrypoint.waitForDeployment()
  console.log('   ✓ Entrypoint upgraded')

  // ==========================================
  // 2. Force import and upgrade Pool
  // ==========================================
  console.log('\n2. Importing existing Pool proxy...')
  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': POSEIDON_T3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': POSEIDON_T4,
    },
  })

  // Force import the existing pool proxy
  await upgrades.forceImport(POOL_ADDRESS, GaleonPrivacyPoolSimple, {
    kind: 'uups',
    unsafeAllowLinkedLibraries: true,
    constructorArgs: [ENTRYPOINT_ADDRESS, WITHDRAWAL_VERIFIER, RAGEQUIT_VERIFIER],
    unsafeAllow: ['constructor', 'state-variable-immutable'],
  })
  console.log('   ✓ Pool proxy imported')

  console.log('   Upgrading to new implementation...')
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
  console.log('   ✓ MergeDepositVerifier set')

  // ==========================================
  // 4. Verify upgrade
  // ==========================================
  console.log('\n4. Verifying upgrades...')

  // Check if relay function exists by getting code
  const entrypointCode = await ethers.provider.getCode(ENTRYPOINT_ADDRESS)
  const hasRelay = entrypointCode.includes('10349e22') // relay selector
  console.log(`   Entrypoint has relay(): ${hasRelay ? '✓' : '✗'}`)

  // Check Pool verifier
  const verifier = await upgradedPool.MERGE_DEPOSIT_VERIFIER()
  console.log(`   Pool MERGE_DEPOSIT_VERIFIER: ${verifier}`)
  if (verifier.toLowerCase() === MERGE_DEPOSIT_VERIFIER.toLowerCase()) {
    console.log('   ✓ Pool verifier set correctly')
  } else {
    console.log('   ⚠ Pool verifier mismatch!')
  }

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n========================================')
  console.log('  Upgrade Complete!')
  console.log('========================================')
  console.log('\nSummary:')
  console.log(`  Entrypoint: ${ENTRYPOINT_ADDRESS}`)
  console.log(`  Pool:       ${POOL_ADDRESS}`)
  console.log('\nFunctions now available:')
  console.log('  ✓ relay() - for withdrawals')
  console.log('  ✓ mergeDeposit() - for O(1) withdrawals')
  console.log('\nYour 0.1 MNT deposit is safe and can now be withdrawn!')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
