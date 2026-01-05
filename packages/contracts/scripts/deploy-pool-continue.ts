import { ethers, upgrades } from 'hardhat'

/**
 * Continuation script for Privacy Pool deployment.
 * Use this after the initial deploy-pool.ts failed partway through.
 *
 * Already deployed (Jan 4, 2026 run):
 * - WithdrawalVerifier: 0x32f0240E1Acf7326B598eE850998CaFEA4aEABb7
 * - RagequitVerifier: 0xAE1126645a26bC30B9A29D9c216e8F6B51B82803
 * - MergeDepositVerifier: 0x05DB69e37b8c7509E9d97826249385682CE9b29d
 * - GaleonEntrypoint: 0x8633518fbbf23E78586F1456530c3452885efb21
 * - PoseidonT3: 0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954
 * - PoseidonT4: 0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892
 */

const ALREADY_DEPLOYED = {
  withdrawalVerifier: '0x32f0240E1Acf7326B598eE850998CaFEA4aEABb7',
  ragequitVerifier: '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803',
  mergeDepositVerifier: '0x05DB69e37b8c7509E9d97826249385682CE9b29d',
  entrypoint: '0x8633518fbbf23E78586F1456530c3452885efb21',
  galeonRegistry: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D',
  poseidonT3: '0x462Ae54A52bF9219F7E85C7C87C520B14E5Ac954',
  poseidonT4: '0x5805333A7E0A617cBeBb49D1D50aB0716b3dF892',
}

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  if (chainId !== 5000) {
    throw new Error(`This script is for Mantle mainnet (5000), got ${chainId}`)
  }

  console.log(`\n========================================`)
  console.log(`  Continuing Privacy Pool deployment`)
  console.log(`  Chain: Mantle (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  console.log('Already deployed:')
  console.log(`  WithdrawalVerifier:   ${ALREADY_DEPLOYED.withdrawalVerifier}`)
  console.log(`  RagequitVerifier:     ${ALREADY_DEPLOYED.ragequitVerifier}`)
  console.log(`  MergeDepositVerifier: ${ALREADY_DEPLOYED.mergeDepositVerifier}`)
  console.log(`  GaleonEntrypoint:     ${ALREADY_DEPLOYED.entrypoint}`)
  console.log(`  PoseidonT3:           ${ALREADY_DEPLOYED.poseidonT3}`)
  console.log(`  PoseidonT4:           ${ALREADY_DEPLOYED.poseidonT4}`)
  console.log('')

  // 1. Deploy GaleonPrivacyPoolSimple (UUPS Proxy) with linked libraries
  console.log('1. Deploying GaleonPrivacyPoolSimple (UUPS Proxy)...')
  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': ALREADY_DEPLOYED.poseidonT3,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': ALREADY_DEPLOYED.poseidonT4,
    },
  })

  const pool = await upgrades.deployProxy(
    GaleonPrivacyPoolSimple,
    [
      deployer.address, // owner
      ALREADY_DEPLOYED.entrypoint,
      ALREADY_DEPLOYED.withdrawalVerifier,
      ALREADY_DEPLOYED.ragequitVerifier,
      ALREADY_DEPLOYED.galeonRegistry,
    ],
    {
      kind: 'uups',
      constructorArgs: [
        ALREADY_DEPLOYED.entrypoint,
        ALREADY_DEPLOYED.withdrawalVerifier,
        ALREADY_DEPLOYED.ragequitVerifier,
      ],
      unsafeAllowLinkedLibraries: true,
      unsafeAllow: ['constructor', 'state-variable-immutable'],
    }
  )
  await pool.waitForDeployment()
  const poolAddr = await pool.getAddress()
  console.log(`   ✓ GaleonPrivacyPoolSimple: ${poolAddr}`)

  // 2. Register pool with entrypoint
  console.log('2. Registering pool with entrypoint...')
  const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  const MIN_DEPOSIT = ethers.parseEther('0.01') // 0.01 MNT minimum
  const VETTING_FEE_BPS = 0 // 0% vetting fee
  const MAX_RELAY_FEE_BPS = 500 // 5% max relay fee

  const entrypoint = await ethers.getContractAt('GaleonEntrypoint', ALREADY_DEPLOYED.entrypoint)
  await entrypoint.registerPool(
    NATIVE_ASSET,
    poolAddr,
    MIN_DEPOSIT,
    VETTING_FEE_BPS,
    MAX_RELAY_FEE_BPS
  )
  console.log(`   ✓ Pool registered with entrypoint`)

  // 2b. Set MergeDepositVerifier on pool
  console.log('2b. Setting MergeDepositVerifier on pool...')
  const poolContract = await ethers.getContractAt('GaleonPrivacyPoolSimple', poolAddr)
  const setVerifierTx = await poolContract.setMergeDepositVerifier(
    ALREADY_DEPLOYED.mergeDepositVerifier
  )
  await setVerifierTx.wait()
  console.log(`   ✓ MergeDepositVerifier set on pool`)

  // 2c. Authorize pool in GaleonRegistry (required for deposits!)
  console.log('2c. Authorizing pool in GaleonRegistry...')
  const registry = await ethers.getContractAt('GaleonRegistry', ALREADY_DEPLOYED.galeonRegistry)
  const authorizeTx = await registry.setAuthorizedPool(poolAddr, true)
  await authorizeTx.wait()
  console.log(`   ✓ Pool authorized in GaleonRegistry`)

  // 3. Update initial ASP root
  console.log('3. Setting initial ASP root...')
  const INITIAL_ROOT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292'
  const INITIAL_IPFS_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

  await entrypoint.updateRoot(INITIAL_ROOT, INITIAL_IPFS_CID)
  console.log(`   ✓ Initial ASP root set`)

  // Summary
  console.log(`\n========================================`)
  console.log(`  Privacy Pool Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`Contract Addresses:`)
  console.log(`  withdrawalVerifier:    '${ALREADY_DEPLOYED.withdrawalVerifier}'`)
  console.log(`  ragequitVerifier:      '${ALREADY_DEPLOYED.ragequitVerifier}'`)
  console.log(`  mergeDepositVerifier:  '${ALREADY_DEPLOYED.mergeDepositVerifier}'`)
  console.log(`  entrypoint:            '${ALREADY_DEPLOYED.entrypoint}'`)
  console.log(`  pool:                  '${poolAddr}'`)
  console.log(`  galeonRegistry:        '${ALREADY_DEPLOYED.galeonRegistry}'`)

  console.log(`\nExplorer Links:`)
  console.log(`  Pool: https://mantlescan.xyz/address/${poolAddr}`)

  console.log(`\n📋 Update packages/config/src/contracts.ts with:\n`)
  console.log(`  pool: {`)
  console.log(`    entrypoint: '${ALREADY_DEPLOYED.entrypoint}',`)
  console.log(`    pool: '${poolAddr}',`)
  console.log(`    withdrawalVerifier: '${ALREADY_DEPLOYED.withdrawalVerifier}',`)
  console.log(`    ragequitVerifier: '${ALREADY_DEPLOYED.ragequitVerifier}',`)
  console.log(`  },`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
