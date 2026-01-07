import { ethers } from 'hardhat'

/**
 * Finish Upgrade - Point proxies to already-deployed implementations
 *
 * Run: npx hardhat run scripts/finish-upgrade.ts --network mantle
 */

const ENTRYPOINT_PROXY = '0x8633518fbbf23E78586F1456530c3452885efb21'
const POOL_PROXY = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'

// Already deployed implementation (from previous run)
const NEW_ENTRYPOINT_IMPL = '0x14008E78B963B830542cf6d8EF250D2cfB356B1B'

// Verifiers
const MERGE_DEPOSIT_VERIFIER = '0x05DB69e37b8c7509E9d97826249385682CE9b29d'
const WITHDRAWAL_VERIFIER = '0x32f0240E1Acf7326B598eE850998CaFEA4aEABb7'
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'

// Libraries
const POSEIDON_T3 = '0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954'
const POSEIDON_T4 = '0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892'

async function main() {
  console.log('\n========================================')
  console.log('  Finishing Upgrade')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  // ==========================================
  // 1. Upgrade Entrypoint Proxy
  // ==========================================
  console.log('\n1. Upgrading Entrypoint proxy to', NEW_ENTRYPOINT_IMPL)

  const entrypointProxy = await ethers.getContractAt('GaleonEntrypoint', ENTRYPOINT_PROXY)
  const upgradeTx = await entrypointProxy.upgradeToAndCall(NEW_ENTRYPOINT_IMPL, '0x')
  console.log(`   Tx hash: ${upgradeTx.hash}`)
  await upgradeTx.wait()
  console.log('   ✓ Entrypoint upgraded')

  // ==========================================
  // 2. Deploy and Upgrade Pool
  // ==========================================
  console.log('\n2. Deploying new Pool implementation...')

  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': POSEIDON_T3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': POSEIDON_T4,
    },
  })

  const poolImpl = await GaleonPrivacyPoolSimple.deploy(
    ENTRYPOINT_PROXY,
    WITHDRAWAL_VERIFIER,
    RAGEQUIT_VERIFIER
  )
  await poolImpl.waitForDeployment()
  const poolImplAddress = await poolImpl.getAddress()
  console.log(`   ✓ Pool implementation: ${poolImplAddress}`)

  console.log('\n3. Upgrading Pool proxy...')
  const poolProxy = await ethers.getContractAt('GaleonPrivacyPoolSimple', POOL_PROXY)
  const poolUpgradeTx = await poolProxy.upgradeToAndCall(poolImplAddress, '0x')
  console.log(`   Tx hash: ${poolUpgradeTx.hash}`)
  await poolUpgradeTx.wait()
  console.log('   ✓ Pool upgraded')

  // ==========================================
  // 3. Set MergeDepositVerifier
  // ==========================================
  console.log('\n4. Setting MergeDepositVerifier...')
  const setVerifierTx = await poolProxy.setMergeDepositVerifier(MERGE_DEPOSIT_VERIFIER)
  await setVerifierTx.wait()
  console.log('   ✓ MergeDepositVerifier set')

  // ==========================================
  // Verify
  // ==========================================
  console.log('\n5. Verifying...')

  const entrypointImplSlot = await ethers.provider.getStorage(
    ENTRYPOINT_PROXY,
    '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc'
  )
  const actualImpl = '0x' + entrypointImplSlot.slice(-40)
  console.log(`   Entrypoint implementation: ${actualImpl}`)
  console.log(`   Expected: ${NEW_ENTRYPOINT_IMPL.toLowerCase()}`)
  console.log(
    `   Match: ${actualImpl.toLowerCase() === NEW_ENTRYPOINT_IMPL.toLowerCase() ? '✓' : '✗'}`
  )

  const implCode = await ethers.provider.getCode(actualImpl)
  const hasRelay = implCode.toLowerCase().includes('8a44121e')
  console.log(`   relay() (0x8a44121e) in bytecode: ${hasRelay ? '✓' : '✗'}`)

  console.log('\n========================================')
  console.log('  ✓ Upgrade Complete!')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
