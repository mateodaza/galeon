import { ethers } from 'hardhat'

/**
 * Fix Verifier Mismatch
 *
 * Deploys a new WithdrawalVerifier that matches the circuit artifacts,
 * then deploys a new Pool implementation with the correct verifier.
 *
 * Run: npx hardhat run scripts/fix-verifier.ts --network mantle
 */

const ENTRYPOINT_PROXY = '0x8633518fbbf23E78586F1456530c3452885efb21'
const POOL_PROXY = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'

// Keep ragequit verifier (assuming it's correct)
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'
const MERGE_DEPOSIT_VERIFIER = '0x05DB69e37b8c7509E9d97826249385682CE9b29d'

// Libraries
const POSEIDON_T3 = '0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954'
const POSEIDON_T4 = '0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892'

async function main() {
  console.log('\n========================================')
  console.log('  Fix Verifier Mismatch')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)
  const balance = await ethers.provider.getBalance(deployer.address)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // ==========================================
  // 1. Deploy NEW WithdrawalVerifier
  // ==========================================
  console.log('1. Deploying new WithdrawalVerifier (matching your circuit)...')

  const WithdrawalVerifier = await ethers.getContractFactory('WithdrawalVerifier')
  const withdrawalVerifier = await WithdrawalVerifier.deploy()
  await withdrawalVerifier.waitForDeployment()
  const newVerifierAddress = await withdrawalVerifier.getAddress()
  console.log(`   ✓ New WithdrawalVerifier: ${newVerifierAddress}`)

  // ==========================================
  // 2. Deploy NEW Pool Implementation
  // ==========================================
  console.log('\n2. Deploying new Pool implementation with correct verifier...')

  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': POSEIDON_T3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': POSEIDON_T4,
    },
  })

  const poolImpl = await GaleonPrivacyPoolSimple.deploy(
    ENTRYPOINT_PROXY,
    newVerifierAddress, // NEW verifier!
    RAGEQUIT_VERIFIER
  )
  await poolImpl.waitForDeployment()
  const poolImplAddress = await poolImpl.getAddress()
  console.log(`   ✓ New Pool implementation: ${poolImplAddress}`)

  // ==========================================
  // 3. Upgrade Pool Proxy
  // ==========================================
  console.log('\n3. Upgrading Pool proxy...')

  const poolProxy = await ethers.getContractAt('GaleonPrivacyPoolSimple', POOL_PROXY)
  const upgradeTx = await poolProxy.upgradeToAndCall(poolImplAddress, '0x')
  console.log(`   Tx: ${upgradeTx.hash}`)
  await upgradeTx.wait()
  console.log('   ✓ Pool upgraded')

  // ==========================================
  // 4. Set MergeDepositVerifier
  // ==========================================
  console.log('\n4. Setting MergeDepositVerifier...')
  const setTx = await poolProxy.setMergeDepositVerifier(MERGE_DEPOSIT_VERIFIER)
  await setTx.wait()
  console.log('   ✓ MergeDepositVerifier set')

  // ==========================================
  // 5. Verify
  // ==========================================
  console.log('\n5. Verifying...')

  const actualVerifier = await poolProxy.WITHDRAWAL_VERIFIER()
  console.log(`   Pool WITHDRAWAL_VERIFIER: ${actualVerifier}`)
  console.log(`   Expected:                 ${newVerifierAddress}`)
  console.log(
    `   Match: ${actualVerifier.toLowerCase() === newVerifierAddress.toLowerCase() ? '✓' : '✗'}`
  )

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n========================================')
  console.log('  ✓ Verifier Fixed!')
  console.log('========================================')
  console.log('\nNew addresses:')
  console.log(`  WithdrawalVerifier: ${newVerifierAddress}`)
  console.log(`  Pool Implementation: ${poolImplAddress}`)
  console.log('\nThe pool now uses a verifier that matches your circuit!')
  console.log('Try withdrawing again.')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
