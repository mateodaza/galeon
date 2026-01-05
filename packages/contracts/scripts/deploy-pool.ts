import { ethers, upgrades } from 'hardhat'

interface ChainConfig {
  name: string
  explorer: string
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  5003: {
    name: 'Mantle Sepolia',
    explorer: 'https://sepolia.mantlescan.xyz',
  },
  5000: {
    name: 'Mantle',
    explorer: 'https://mantlescan.xyz',
  },
}

// Existing GaleonRegistry addresses
const GALEON_REGISTRY: Record<number, string> = {
  5003: '0x0000000000000000000000000000000000000000', // Sepolia - not used
  5000: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D', // Mantle mainnet
}

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)
  const config = CHAIN_CONFIGS[chainId]

  if (!config) {
    throw new Error(
      `Unsupported chain: ${chainId}. Supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`
    )
  }

  const galeonRegistryAddr = GALEON_REGISTRY[chainId]
  if (galeonRegistryAddr === '0x0000000000000000000000000000000000000000') {
    throw new Error(
      `GaleonRegistry address not set for chain ${chainId}. Run deploy.ts first and update GALEON_REGISTRY.`
    )
  }

  console.log(`\n========================================`)
  console.log(`  Deploying Privacy Pool contracts`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // 1. Deploy WithdrawalVerifier
  console.log('1. Deploying WithdrawalVerifier...')
  const WithdrawalVerifier = await ethers.getContractFactory('WithdrawalVerifier')
  const withdrawalVerifier = await WithdrawalVerifier.deploy()
  await withdrawalVerifier.waitForDeployment()
  const withdrawalVerifierAddr = await withdrawalVerifier.getAddress()
  console.log(`   ✓ WithdrawalVerifier: ${withdrawalVerifierAddr}`)

  // 2. Deploy RagequitVerifier
  console.log('2. Deploying RagequitVerifier...')
  const RagequitVerifier = await ethers.getContractFactory('RagequitVerifier')
  const ragequitVerifier = await RagequitVerifier.deploy()
  await ragequitVerifier.waitForDeployment()
  const ragequitVerifierAddr = await ragequitVerifier.getAddress()
  console.log(`   ✓ RagequitVerifier: ${ragequitVerifierAddr}`)

  // 2b. Deploy MergeDepositVerifier
  console.log('2b. Deploying MergeDepositVerifier...')
  const MergeDepositVerifier = await ethers.getContractFactory('MergeDepositVerifier')
  const mergeDepositVerifier = await MergeDepositVerifier.deploy()
  await mergeDepositVerifier.waitForDeployment()
  const mergeDepositVerifierAddr = await mergeDepositVerifier.getAddress()
  console.log(`   ✓ MergeDepositVerifier: ${mergeDepositVerifierAddr}`)

  // 3. Deploy GaleonEntrypoint (UUPS Proxy)
  console.log('3. Deploying GaleonEntrypoint (UUPS Proxy)...')
  const GaleonEntrypoint = await ethers.getContractFactory('GaleonEntrypoint')
  const entrypoint = await upgrades.deployProxy(
    GaleonEntrypoint,
    [deployer.address, deployer.address], // owner and postman (both deployer for now)
    { kind: 'uups' }
  )
  await entrypoint.waitForDeployment()
  const entrypointAddr = await entrypoint.getAddress()
  console.log(`   ✓ GaleonEntrypoint: ${entrypointAddr}`)

  // 4. Deploy Poseidon libraries
  console.log('4. Deploying Poseidon libraries...')
  const PoseidonT3 = await ethers.getContractFactory('PoseidonT3')
  const poseidonT3 = await PoseidonT3.deploy()
  await poseidonT3.waitForDeployment()
  const poseidonT3Addr = await poseidonT3.getAddress()
  console.log(`   ✓ PoseidonT3: ${poseidonT3Addr}`)

  const PoseidonT4 = await ethers.getContractFactory('PoseidonT4')
  const poseidonT4 = await PoseidonT4.deploy()
  await poseidonT4.waitForDeployment()
  const poseidonT4Addr = await poseidonT4.getAddress()
  console.log(`   ✓ PoseidonT4: ${poseidonT4Addr}`)

  // 5. Deploy GaleonPrivacyPoolSimple (UUPS Proxy) with linked libraries
  console.log('5. Deploying GaleonPrivacyPoolSimple (UUPS Proxy)...')
  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Addr,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Addr,
    },
  })

  // For UUPS with constructor args, we need to use deployProxy with constructorArgs
  // Note: unsafeAllow flags needed because base contracts use constructors for immutable vars
  const pool = await upgrades.deployProxy(
    GaleonPrivacyPoolSimple,
    [
      deployer.address, // owner
      entrypointAddr, // entrypoint
      withdrawalVerifierAddr, // withdrawal verifier
      ragequitVerifierAddr, // ragequit verifier
      galeonRegistryAddr, // galeon registry
    ],
    {
      kind: 'uups',
      constructorArgs: [entrypointAddr, withdrawalVerifierAddr, ragequitVerifierAddr],
      unsafeAllowLinkedLibraries: true,
      unsafeAllow: ['constructor', 'state-variable-immutable'],
    }
  )
  await pool.waitForDeployment()
  const poolAddr = await pool.getAddress()
  console.log(`   ✓ GaleonPrivacyPoolSimple: ${poolAddr}`)

  // 6. Register pool with entrypoint
  console.log('6. Registering pool with entrypoint...')
  const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  const MIN_DEPOSIT = ethers.parseEther('0.01') // 0.01 MNT minimum
  const VETTING_FEE_BPS = 0 // 0% vetting fee
  const MAX_RELAY_FEE_BPS = 500 // 5% max relay fee

  const entrypointContract = await ethers.getContractAt('GaleonEntrypoint', entrypointAddr)
  await entrypointContract.registerPool(
    NATIVE_ASSET,
    poolAddr,
    MIN_DEPOSIT,
    VETTING_FEE_BPS,
    MAX_RELAY_FEE_BPS
  )
  console.log(`   ✓ Pool registered with entrypoint`)

  // 6b. Set MergeDepositVerifier on pool
  console.log('6b. Setting MergeDepositVerifier on pool...')
  const poolContract = await ethers.getContractAt('GaleonPrivacyPoolSimple', poolAddr)
  const setVerifierTx = await poolContract.setMergeDepositVerifier(mergeDepositVerifierAddr)
  await setVerifierTx.wait()
  console.log(`   ✓ MergeDepositVerifier set on pool`)

  // 6c. Authorize pool in GaleonRegistry (required for deposits!)
  console.log('6c. Authorizing pool in GaleonRegistry...')
  const registryContract = await ethers.getContractAt('GaleonRegistry', galeonRegistryAddr)
  const authorizeTx = await registryContract.setAuthorizedPool(poolAddr, true)
  await authorizeTx.wait()
  console.log(`   ✓ Pool authorized in GaleonRegistry`)

  // 7. Update initial ASP root (empty for now - will be updated by ASP)
  console.log('7. Setting initial ASP root...')
  // For now, set a placeholder root. In production, this would be the actual ASP root.
  const INITIAL_ROOT =
    '21663839004416932945382355908790599225266501822907911457504978515578255421292' // Hash of empty set
  const INITIAL_IPFS_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi' // placeholder

  await entrypointContract.updateRoot(INITIAL_ROOT, INITIAL_IPFS_CID)
  console.log(`   ✓ Initial ASP root set`)

  // Summary
  console.log(`\n========================================`)
  console.log(`  Privacy Pool Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`Contract Addresses:`)
  console.log(`  withdrawalVerifier:    '${withdrawalVerifierAddr}'`)
  console.log(`  ragequitVerifier:      '${ragequitVerifierAddr}'`)
  console.log(`  mergeDepositVerifier:  '${mergeDepositVerifierAddr}'`)
  console.log(`  entrypoint:            '${entrypointAddr}'`)
  console.log(`  pool:                  '${poolAddr}'`)
  console.log(`  galeonRegistry:        '${galeonRegistryAddr}'`)

  console.log(`\nExplorer Links:`)
  console.log(`  WithdrawalVerifier:    ${config.explorer}/address/${withdrawalVerifierAddr}`)
  console.log(`  RagequitVerifier:      ${config.explorer}/address/${ragequitVerifierAddr}`)
  console.log(`  MergeDepositVerifier:  ${config.explorer}/address/${mergeDepositVerifierAddr}`)
  console.log(`  Entrypoint:            ${config.explorer}/address/${entrypointAddr}`)
  console.log(`  Pool:                  ${config.explorer}/address/${poolAddr}`)

  const networkName = chainId === 5000 ? 'mantle' : 'mantleSepolia'
  console.log(`\n🔍 Verify contracts:`)
  console.log(`  npx hardhat verify --network ${networkName} ${withdrawalVerifierAddr}`)
  console.log(`  npx hardhat verify --network ${networkName} ${ragequitVerifierAddr}`)
  console.log(`  npx hardhat verify --network ${networkName} ${mergeDepositVerifierAddr}`)
  console.log(
    `\n  For proxy contracts, use OpenZeppelin's verification plugin or manual verification`
  )

  console.log(`\n📋 Update packages/config/src/contracts.ts with:\n`)
  console.log(`  pool: {`)
  console.log(`    entrypoint: '${entrypointAddr}',`)
  console.log(`    pool: '${poolAddr}',`)
  console.log(`    withdrawalVerifier: '${withdrawalVerifierAddr}',`)
  console.log(`    ragequitVerifier: '${ragequitVerifierAddr}',`)
  console.log(`  },`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
