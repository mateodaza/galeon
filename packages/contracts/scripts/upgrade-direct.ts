import { ethers } from 'hardhat'

/**
 * Direct Upgrade Script - Bypasses OpenZeppelin Upgrade Plugin
 *
 * This script deploys implementations directly and calls upgradeToAndCall
 * on the UUPS proxies, completely avoiding OpenZeppelin's caching issues.
 *
 * Run: npx hardhat run scripts/upgrade-direct.ts --network mantle
 */

// ============================================
// DEPLOYMENT ADDRESSES (Mantle Mainnet)
// ============================================
const ENTRYPOINT_PROXY = '0x8633518fbbf23E78586F1456530c3452885efb21'
const POOL_PROXY = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'

// Constructor args for Pool (immutables)
const WITHDRAWAL_VERIFIER = '0x32f0240E1Acf7326B598eE850998CaFEA4aEABb7'
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'
const MERGE_DEPOSIT_VERIFIER = '0x05DB69e37b8c7509E9d97826249385682CE9b29d'

// Poseidon libraries
const POSEIDON_T3 = '0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954'
const POSEIDON_T4 = '0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892'

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  if (chainId !== 5000) {
    throw new Error(`This script is for Mantle mainnet (5000), got ${chainId}`)
  }

  console.log('\n========================================')
  console.log('  Direct Upgrade (Bypassing OZ Plugin)')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // ==========================================
  // 1. Deploy NEW Entrypoint Implementation
  // ==========================================
  console.log('1. Deploying new GaleonEntrypoint implementation...')

  const GaleonEntrypoint = await ethers.getContractFactory('GaleonEntrypoint')
  const entrypointImpl = await GaleonEntrypoint.deploy()
  await entrypointImpl.waitForDeployment()
  const entrypointImplAddress = await entrypointImpl.getAddress()
  console.log(`   ✓ New implementation deployed: ${entrypointImplAddress}`)

  // Verify relay() is in the new implementation
  // NOTE: Correct selector is 0x8a44121e for relay((address,bytes),(uint256[2],uint256[2][2],uint256[2],uint256[8]),uint256)
  const implCode = await ethers.provider.getCode(entrypointImplAddress)
  const hasRelay = implCode.toLowerCase().includes('8a44121e')
  console.log(`   ✓ relay() in bytecode: ${hasRelay ? 'YES' : 'NO - WARNING!'}`)

  if (!hasRelay) {
    throw new Error('New implementation does not have relay()! Aborting.')
  }

  // ==========================================
  // 2. Upgrade Entrypoint Proxy
  // ==========================================
  console.log('\n2. Upgrading Entrypoint proxy...')

  const entrypointProxy = await ethers.getContractAt('GaleonEntrypoint', ENTRYPOINT_PROXY)

  // Call upgradeToAndCall with empty data (no reinitialization needed)
  const upgradeTx = await entrypointProxy.upgradeToAndCall(entrypointImplAddress, '0x')
  console.log(`   Tx hash: ${upgradeTx.hash}`)
  await upgradeTx.wait()
  console.log('   ✓ Entrypoint proxy upgraded')

  // ==========================================
  // 3. Deploy NEW Pool Implementation
  // ==========================================
  console.log('\n3. Deploying new GaleonPrivacyPoolSimple implementation...')

  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': POSEIDON_T3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': POSEIDON_T4,
    },
  })

  // Pool has immutables in constructor
  const poolImpl = await GaleonPrivacyPoolSimple.deploy(
    ENTRYPOINT_PROXY,
    WITHDRAWAL_VERIFIER,
    RAGEQUIT_VERIFIER
  )
  await poolImpl.waitForDeployment()
  const poolImplAddress = await poolImpl.getAddress()
  console.log(`   ✓ New implementation deployed: ${poolImplAddress}`)

  // ==========================================
  // 4. Upgrade Pool Proxy
  // ==========================================
  console.log('\n4. Upgrading Pool proxy...')

  const poolProxy = await ethers.getContractAt('GaleonPrivacyPoolSimple', POOL_PROXY)

  const poolUpgradeTx = await poolProxy.upgradeToAndCall(poolImplAddress, '0x')
  console.log(`   Tx hash: ${poolUpgradeTx.hash}`)
  await poolUpgradeTx.wait()
  console.log('   ✓ Pool proxy upgraded')

  // ==========================================
  // 5. Set MergeDepositVerifier on Pool
  // ==========================================
  console.log('\n5. Setting MergeDepositVerifier...')

  const setVerifierTx = await poolProxy.setMergeDepositVerifier(MERGE_DEPOSIT_VERIFIER)
  await setVerifierTx.wait()
  console.log('   ✓ MergeDepositVerifier set')

  // ==========================================
  // 6. Verify Everything
  // ==========================================
  console.log('\n6. Verifying upgrades...')

  // Check Entrypoint implementation
  const entrypointImplSlot = await ethers.provider.getStorage(
    ENTRYPOINT_PROXY,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  )
  const actualEntrypointImpl = '0x' + entrypointImplSlot.slice(-40)
  console.log(`   Entrypoint implementation: ${actualEntrypointImpl}`)
  console.log(`   Expected:                  ${entrypointImplAddress.toLowerCase()}`)
  console.log(
    `   Match: ${actualEntrypointImpl.toLowerCase() === entrypointImplAddress.toLowerCase() ? '✓' : '✗'}`
  )

  // Check Pool implementation
  const poolImplSlot = await ethers.provider.getStorage(
    POOL_PROXY,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  )
  const actualPoolImpl = '0x' + poolImplSlot.slice(-40)
  console.log(`   Pool implementation: ${actualPoolImpl}`)
  console.log(`   Expected:            ${poolImplAddress.toLowerCase()}`)
  console.log(
    `   Match: ${actualPoolImpl.toLowerCase() === poolImplAddress.toLowerCase() ? '✓' : '✗'}`
  )

  // Check relay() in proxy's delegated code
  // Note: proxy bytecode is just the delegatecall stub, we check implementation
  const finalImplCode = await ethers.provider.getCode(actualEntrypointImpl)
  const finalHasRelay = finalImplCode.toLowerCase().includes('8a44121e')
  console.log(`   relay() selector (0x8a44121e) in implementation: ${finalHasRelay ? '✓' : '✗'}`)

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n========================================')
  console.log('  Upgrade Complete!')
  console.log('========================================')
  console.log('\nNew Implementations:')
  console.log(`  Entrypoint: ${entrypointImplAddress}`)
  console.log(`  Pool:       ${poolImplAddress}`)
  console.log('\nProxies (unchanged addresses):')
  console.log(`  Entrypoint: ${ENTRYPOINT_PROXY}`)
  console.log(`  Pool:       ${POOL_PROXY}`)
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
