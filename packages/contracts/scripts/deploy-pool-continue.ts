import { ethers, upgrades } from 'hardhat'

/**
 * Continuation script for Privacy Pool deployment.
 * Use this after the initial deploy-pool.ts failed partway through.
 *
 * Already deployed (from previous run):
 * - WithdrawalVerifier: 0x7529e3ec251A648A873F53d9969c1C05a44029A1
 * - RagequitVerifier: 0xFDb199E0aC8eC430541438aa6E63101F8C205D76
 * - GaleonEntrypoint: 0x54BA91d29f84B8bAd161880798877e59f2999f7a
 */

const ALREADY_DEPLOYED = {
  withdrawalVerifier: '0x7529e3ec251A648A873F53d9969c1C05a44029A1',
  ragequitVerifier: '0xFDb199E0aC8eC430541438aa6E63101F8C205D76',
  entrypoint: '0x54BA91d29f84B8bAd161880798877e59f2999f7a',
  galeonRegistry: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D',
  poseidonT3: '0xAE4c25FF221d3aa361B39DA242357fa04420215D',
  poseidonT4: '0x95Ed84fE7A51ba9680D217aAf2EB6ED3E1977e45',
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
  console.log(`  WithdrawalVerifier: ${ALREADY_DEPLOYED.withdrawalVerifier}`)
  console.log(`  RagequitVerifier: ${ALREADY_DEPLOYED.ragequitVerifier}`)
  console.log(`  GaleonEntrypoint: ${ALREADY_DEPLOYED.entrypoint}`)
  console.log(`  PoseidonT3: ${ALREADY_DEPLOYED.poseidonT3}`)
  console.log(`  PoseidonT4: ${ALREADY_DEPLOYED.poseidonT4}`)
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
  console.log(`  poseidonT3:         '${ALREADY_DEPLOYED.poseidonT3}'`)
  console.log(`  poseidonT4:         '${ALREADY_DEPLOYED.poseidonT4}'`)
  console.log(`  withdrawalVerifier: '${ALREADY_DEPLOYED.withdrawalVerifier}'`)
  console.log(`  ragequitVerifier:   '${ALREADY_DEPLOYED.ragequitVerifier}'`)
  console.log(`  entrypoint:         '${ALREADY_DEPLOYED.entrypoint}'`)
  console.log(`  pool:               '${poolAddr}'`)
  console.log(`  galeonRegistry:     '${ALREADY_DEPLOYED.galeonRegistry}'`)

  console.log(`\nExplorer Links:`)
  console.log(`  Pool:               https://mantlescan.xyz/address/${poolAddr}`)

  console.log(`\n📋 Update packages/pool/src/contracts.ts with:\n`)
  console.log(`  5000: {`)
  console.log(`    entrypoint: '${ALREADY_DEPLOYED.entrypoint}' as const,`)
  console.log(`    pool: '${poolAddr}' as const,`)
  console.log(`    withdrawalVerifier: '${ALREADY_DEPLOYED.withdrawalVerifier}' as const,`)
  console.log(`    ragequitVerifier: '${ALREADY_DEPLOYED.ragequitVerifier}' as const,`)
  console.log(`  },`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
