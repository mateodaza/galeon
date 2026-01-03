import { ethers, upgrades } from 'hardhat'

/**
 * Deploy the Privacy Pool v2 system (UUPS upgradeable):
 * 1. Poseidon libraries (PoseidonT3, PoseidonT4)
 * 2. MockVerifier (placeholder for withdrawal + ragequit)
 * 3. GaleonEntrypoint proxy
 * 4. GaleonPrivacyPoolSimple proxy (with library linking)
 * 5. Register pool with entrypoint
 * 6. Authorize pool in GaleonRegistry
 * 7. Seed initial ASP root
 */

interface ChainConfig {
  name: string
  explorer: string
  galeonRegistry: `0x${string}`
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  5003: {
    name: 'Mantle Sepolia',
    explorer: 'https://sepolia.mantlescan.xyz',
    galeonRegistry: '0x0000000000000000000000000000000000000000', // Not deployed on Sepolia
  },
  5000: {
    name: 'Mantle Mainnet',
    explorer: 'https://mantlescan.xyz',
    galeonRegistry: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D', // Deployed on Mainnet
  },
}

// Initial ASP root (placeholder - will be updated with real ASP data)
// In production, this would be computed from an actual Association Set
const INITIAL_ASP_ROOT = BigInt(
  '0x0000000000000000000000000000000000000000000000000000000000000001'
)
const INITIAL_ASP_IPFS_CID = 'QmInitialPlaceholderASPRootForTestingPurposes'

// Pool configuration
const MIN_DEPOSIT_AMOUNT = ethers.parseEther('0.01') // 0.01 MNT minimum
const VETTING_FEE_BPS = 0 // 0% vetting fee for hackathon
const MAX_RELAY_FEE_BPS = 100 // 1% max relay fee

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)
  const config = CHAIN_CONFIGS[chainId]

  if (!config) {
    throw new Error(
      `Unsupported chain: ${chainId}. Supported: ${Object.keys(CHAIN_CONFIGS).join(', ')}`
    )
  }

  console.log(`\n========================================`)
  console.log(`  Deploying Privacy Pool v2 System`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT`)
  console.log(`GaleonRegistry: ${config.galeonRegistry}\n`)

  if (config.galeonRegistry === '0x0000000000000000000000000000000000000000') {
    console.log('⚠️  WARNING: GaleonRegistry not set for this chain!')
    console.log('   Pool deposits will fail without registry.\n')
  }

  // 1. Deploy Poseidon libraries
  console.log('1. Deploying Poseidon libraries...')

  // PoseidonT3
  const PoseidonT3 = await ethers.getContractFactory('PoseidonT3')
  const poseidonT3 = await PoseidonT3.deploy()
  await poseidonT3.waitForDeployment()
  const poseidonT3Addr = await poseidonT3.getAddress()
  console.log(`   ✓ PoseidonT3: ${poseidonT3Addr}`)

  // PoseidonT4
  const PoseidonT4 = await ethers.getContractFactory('PoseidonT4')
  const poseidonT4 = await PoseidonT4.deploy()
  await poseidonT4.waitForDeployment()
  const poseidonT4Addr = await poseidonT4.getAddress()
  console.log(`   ✓ PoseidonT4: ${poseidonT4Addr}\n`)

  // 2. Deploy MockVerifier (placeholder for real Groth16 verifier)
  console.log('2. Deploying MockVerifier (placeholder)...')
  const MockVerifier = await ethers.getContractFactory('MockVerifier')
  const mockVerifier = await MockVerifier.deploy()
  await mockVerifier.waitForDeployment()
  const mockVerifierAddr = await mockVerifier.getAddress()
  console.log(`   ✓ MockVerifier: ${mockVerifierAddr}`)
  console.log(`   ⚠️  Replace with real Groth16 verifiers when circuits are ready!\n`)

  // 3. Deploy GaleonEntrypoint as UUPS proxy
  console.log('3. Deploying GaleonEntrypoint proxy...')
  const GaleonEntrypoint = await ethers.getContractFactory('GaleonEntrypoint')
  const entrypoint = await upgrades.deployProxy(
    GaleonEntrypoint,
    [deployer.address, deployer.address], // owner, postman (both deployer for now)
    { kind: 'uups' }
  )
  await entrypoint.waitForDeployment()
  const entrypointAddr = await entrypoint.getAddress()
  console.log(`   ✓ GaleonEntrypoint proxy: ${entrypointAddr}`)

  // Get implementation address
  const entrypointImplAddr = await upgrades.erc1967.getImplementationAddress(entrypointAddr)
  console.log(`   ✓ GaleonEntrypoint impl: ${entrypointImplAddr}\n`)

  // 4. Deploy GaleonPrivacyPoolSimple as UUPS proxy (with library linking)
  console.log('4. Deploying GaleonPrivacyPoolSimple proxy...')

  // Get contract factory with linked libraries
  const GaleonPrivacyPoolSimple = await ethers.getContractFactory('GaleonPrivacyPoolSimple', {
    libraries: {
      'poseidon-solidity/PoseidonT3.sol:PoseidonT3': poseidonT3Addr,
      'poseidon-solidity/PoseidonT4.sol:PoseidonT4': poseidonT4Addr,
    },
  })

  // Deploy proxy using OpenZeppelin upgrades plugin
  const pool = await upgrades.deployProxy(
    GaleonPrivacyPoolSimple,
    [
      deployer.address, // owner
      entrypointAddr, // entrypoint
      mockVerifierAddr, // withdrawal verifier
      mockVerifierAddr, // ragequit verifier
      config.galeonRegistry, // galeon registry
    ],
    {
      kind: 'uups',
      constructorArgs: [entrypointAddr, mockVerifierAddr, mockVerifierAddr],
      unsafeAllow: ['constructor', 'external-library-linking', 'state-variable-immutable'],
    }
  )
  await pool.waitForDeployment()
  const poolAddr = await pool.getAddress()
  console.log(`   ✓ GaleonPrivacyPoolSimple proxy: ${poolAddr}`)

  // Get implementation address
  const poolImplAddr = await upgrades.erc1967.getImplementationAddress(poolAddr)
  console.log(`   ✓ GaleonPrivacyPoolSimple impl: ${poolImplAddr}`)

  // Get SCOPE for this pool
  const scope = await pool.SCOPE()
  console.log(`   ✓ Pool SCOPE: ${scope}\n`)

  // 5. Seed initial ASP root
  console.log('5. Seeding initial ASP root...')
  const updateRootTx = await entrypoint.updateRoot(INITIAL_ASP_ROOT, INITIAL_ASP_IPFS_CID)
  await updateRootTx.wait()
  console.log(`   ✓ Initial ASP root seeded: ${INITIAL_ASP_ROOT}`)
  console.log(`   ✓ IPFS CID: ${INITIAL_ASP_IPFS_CID}\n`)

  // 6. Register pool with entrypoint
  console.log('6. Registering pool with entrypoint...')
  const NATIVE_ASSET = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE' // ERC-7528 native asset
  const registerTx = await entrypoint.registerPool(
    NATIVE_ASSET,
    poolAddr,
    MIN_DEPOSIT_AMOUNT,
    VETTING_FEE_BPS,
    MAX_RELAY_FEE_BPS
  )
  await registerTx.wait()
  console.log(`   ✓ Pool registered for native asset (MNT)`)
  console.log(`   ✓ Min deposit: ${ethers.formatEther(MIN_DEPOSIT_AMOUNT)} MNT`)
  console.log(`   ✓ Vetting fee: ${VETTING_FEE_BPS / 100}%`)
  console.log(`   ✓ Max relay fee: ${MAX_RELAY_FEE_BPS / 100}%\n`)

  // 7. Authorize pool in GaleonRegistry (if set)
  if (config.galeonRegistry !== '0x0000000000000000000000000000000000000000') {
    console.log('7. Authorizing pool in GaleonRegistry...')
    const registry = await ethers.getContractAt('GaleonRegistry', config.galeonRegistry)
    const authTx = await registry.setAuthorizedPool(poolAddr, true)
    await authTx.wait()
    console.log(`   ✓ Pool authorized in GaleonRegistry\n`)
  } else {
    console.log('7. Skipping GaleonRegistry authorization (not deployed)\n')
  }

  // Summary
  console.log(`\n========================================`)
  console.log(`  Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`Contract Addresses:`)
  console.log(`  PoseidonT3:              ${poseidonT3Addr}`)
  console.log(`  PoseidonT4:              ${poseidonT4Addr}`)
  console.log(`  MockVerifier:            ${mockVerifierAddr}`)
  console.log(`  Entrypoint (proxy):      ${entrypointAddr}`)
  console.log(`  Entrypoint (impl):       ${entrypointImplAddr}`)
  console.log(`  Pool (proxy):            ${poolAddr}`)
  console.log(`  Pool (impl):             ${poolImplAddr}`)
  console.log(`  Pool SCOPE:              ${scope}`)

  console.log(`\nExplorer Links:`)
  console.log(`  Entrypoint: ${config.explorer}/address/${entrypointAddr}`)
  console.log(`  Pool:       ${config.explorer}/address/${poolAddr}`)

  console.log(`\n📋 Post-Deployment Checklist:`)
  console.log(`  ✅ Poseidon libraries deployed`)
  console.log(`  ✅ MockVerifier deployed (placeholder)`)
  console.log(`  ✅ GaleonEntrypoint proxy deployed`)
  console.log(`  ✅ GaleonPrivacyPoolSimple proxy deployed`)
  console.log(`  ✅ Initial ASP root seeded`)
  console.log(`  ✅ Pool registered with entrypoint`)
  if (config.galeonRegistry !== '0x0000000000000000000000000000000000000000') {
    console.log(`  ✅ Pool authorized in GaleonRegistry`)
  } else {
    console.log(`  ⏳ Pool authorization pending (GaleonRegistry not deployed)`)
  }

  console.log(`\n🔄 When circuits are ready:`)
  console.log(`  1. Deploy real WithdrawalVerifier and RagequitVerifier`)
  console.log(`  2. Call pool.upgradeVerifiers(withdrawalAddr, ragequitAddr)`)
  console.log(`  3. Update ASP root with production data`)

  console.log(`\n🔍 Verify contracts:`)
  const networkName = chainId === 5000 ? 'mantle' : 'mantleSepolia'
  console.log(`  npx hardhat verify --network ${networkName} ${poseidonT3Addr}`)
  console.log(`  npx hardhat verify --network ${networkName} ${poseidonT4Addr}`)
  console.log(`  npx hardhat verify --network ${networkName} ${mockVerifierAddr}`)
  console.log(`  npx hardhat verify --network ${networkName} ${entrypointImplAddr}`)
  console.log(
    `  npx hardhat verify --network ${networkName} ${poolImplAddr} ${entrypointAddr} ${mockVerifierAddr} ${mockVerifierAddr}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
