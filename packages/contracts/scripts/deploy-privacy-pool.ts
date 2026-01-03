import { ethers } from 'hardhat'

/**
 * Deploy the Privacy Pool system:
 * 1. GaleonPrivacyPool implementation (native MNT)
 * 2. GaleonERC20Pool implementation
 * 3. GaleonPoolFactory
 * 4. Deploy the native MNT pool via factory
 */

interface ChainConfig {
  name: string
  explorer: string
  galeonRegistry: string
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  5003: {
    name: 'Mantle Sepolia',
    explorer: 'https://sepolia.mantlescan.xyz',
    galeonRegistry: '0x0000000000000000000000000000000000000000', // Update after deploy
  },
  5000: {
    name: 'Mantle Mainnet',
    explorer: 'https://mantlescan.xyz',
    galeonRegistry: '0x0000000000000000000000000000000000000000', // Update after deploy
  },
}

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)
  const config = CHAIN_CONFIGS[chainId]

  if (!config) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }

  console.log(`\n========================================`)
  console.log(`  Deploying Privacy Pool System`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // 1. Deploy PrecompileChecker to use as placeholder verifier
  // In production, this would be the real Groth16 verifier from circom
  console.log('1. Deploying placeholder verifier (PrecompileChecker)...')
  const Verifier = await ethers.getContractFactory('PrecompileChecker')
  const verifier = await Verifier.deploy()
  await verifier.waitForDeployment()
  const verifierAddr = await verifier.getAddress()
  console.log(`   ✓ Placeholder Verifier: ${verifierAddr}`)
  console.log(`   ⚠️  Replace with real Groth16 verifier for production!\n`)

  // 2. Deploy GaleonPrivacyPool implementation
  console.log('2. Deploying GaleonPrivacyPool implementation...')
  const NativePool = await ethers.getContractFactory('GaleonPrivacyPool')
  const nativePoolImpl = await NativePool.deploy()
  await nativePoolImpl.waitForDeployment()
  const nativePoolImplAddr = await nativePoolImpl.getAddress()
  console.log(`   ✓ GaleonPrivacyPool impl: ${nativePoolImplAddr}\n`)

  // 3. Deploy GaleonERC20Pool implementation
  console.log('3. Deploying GaleonERC20Pool implementation...')
  const ERC20Pool = await ethers.getContractFactory('GaleonERC20Pool')
  const erc20PoolImpl = await ERC20Pool.deploy()
  await erc20PoolImpl.waitForDeployment()
  const erc20PoolImplAddr = await erc20PoolImpl.getAddress()
  console.log(`   ✓ GaleonERC20Pool impl: ${erc20PoolImplAddr}\n`)

  // 4. Deploy PoolFactory
  console.log('4. Deploying GaleonPoolFactory...')
  const Factory = await ethers.getContractFactory('GaleonPoolFactory')
  const factory = await Factory.deploy(
    nativePoolImplAddr,
    erc20PoolImplAddr,
    verifierAddr,
    config.galeonRegistry || deployer.address // Use deployer as placeholder if no registry
  )
  await factory.waitForDeployment()
  const factoryAddr = await factory.getAddress()
  console.log(`   ✓ GaleonPoolFactory: ${factoryAddr}\n`)

  // 5. Deploy native MNT pool via factory
  console.log('5. Deploying native MNT pool via factory...')
  const deployTx = await factory.deployNativePool()
  await deployTx.wait()
  const nativePoolAddr = await factory.getPool(ethers.ZeroAddress)
  console.log(`   ✓ Native MNT Pool (proxy): ${nativePoolAddr}\n`)

  // Summary
  console.log(`\n========================================`)
  console.log(`  Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`Contract Addresses:`)
  console.log(`  verifier (placeholder): '${verifierAddr}'`)
  console.log(`  nativePoolImpl:         '${nativePoolImplAddr}'`)
  console.log(`  erc20PoolImpl:          '${erc20PoolImplAddr}'`)
  console.log(`  factory:                '${factoryAddr}'`)
  console.log(`  nativePool:             '${nativePoolAddr}'`)

  console.log(`\nExplorer Links:`)
  console.log(`  Factory:    ${config.explorer}/address/${factoryAddr}`)
  console.log(`  Native Pool: ${config.explorer}/address/${nativePoolAddr}`)

  console.log(`\n📋 Next Steps:`)
  console.log(`  1. Deploy real Groth16 verifier from circom circuit`)
  console.log(`  2. Call factory.setDefaultVerifier(realVerifierAddress)`)
  console.log(`  3. Call nativePool.upgradeVerifier(realVerifierAddress)`)
  console.log(`  4. For ERC20 tokens: factory.deployERC20Pool(tokenAddress)`)

  console.log(`\n🔍 Verify contracts:`)
  console.log(
    `  npx hardhat verify --network ${chainId === 5000 ? 'mantle' : 'mantleSepolia'} ${verifierAddr}`
  )
  console.log(
    `  npx hardhat verify --network ${chainId === 5000 ? 'mantle' : 'mantleSepolia'} ${nativePoolImplAddr}`
  )
  console.log(
    `  npx hardhat verify --network ${chainId === 5000 ? 'mantle' : 'mantleSepolia'} ${erc20PoolImplAddr}`
  )
  console.log(
    `  npx hardhat verify --network ${chainId === 5000 ? 'mantle' : 'mantleSepolia'} ${factoryAddr} ${nativePoolImplAddr} ${erc20PoolImplAddr} ${verifierAddr} ${config.galeonRegistry || deployer.address}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
