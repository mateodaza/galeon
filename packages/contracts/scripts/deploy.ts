import { ethers } from 'hardhat'

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
  console.log(`  Deploying Galeon contracts`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // 1. Deploy ERC5564Announcer
  console.log('1. Deploying ERC5564Announcer...')
  const Announcer = await ethers.getContractFactory('ERC5564Announcer')
  const announcer = await Announcer.deploy()
  await announcer.waitForDeployment()
  const announcerAddr = await announcer.getAddress()
  console.log(`   ✓ ERC5564Announcer: ${announcerAddr}`)

  // 2. Deploy ERC6538Registry
  console.log('2. Deploying ERC6538Registry...')
  const Registry = await ethers.getContractFactory('ERC6538Registry')
  const registry = await Registry.deploy()
  await registry.waitForDeployment()
  const registryAddr = await registry.getAddress()
  console.log(`   ✓ ERC6538Registry: ${registryAddr}`)

  // 3. Deploy GaleonRegistry (depends on Announcer + Registry)
  console.log('3. Deploying GaleonRegistry...')
  const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
  const galeon = await GaleonRegistry.deploy(announcerAddr, registryAddr)
  await galeon.waitForDeployment()
  const galeonAddr = await galeon.getAddress()
  console.log(`   ✓ GaleonRegistry: ${galeonAddr}`)

  // 4. Deploy GaleonTender
  console.log('4. Deploying GaleonTender...')
  const GaleonTender = await ethers.getContractFactory('GaleonTender')
  const tender = await GaleonTender.deploy()
  await tender.waitForDeployment()
  const tenderAddr = await tender.getAddress()
  console.log(`   ✓ GaleonTender: ${tenderAddr}`)

  // 5. Set GaleonRegistry as trusted relayer on Announcer
  console.log('5. Setting GaleonRegistry as trusted relayer...')
  await announcer.setTrustedRelayer(galeonAddr, true)
  console.log(`   ✓ GaleonRegistry is now a trusted relayer`)

  // Summary
  console.log(`\n========================================`)
  console.log(`  Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`Contract Addresses:`)
  console.log(`  announcer: '${announcerAddr}'`)
  console.log(`  registry:  '${registryAddr}'`)
  console.log(`  galeon:    '${galeonAddr}'`)
  console.log(`  tender:    '${tenderAddr}'`)

  console.log(`\nExplorer Links:`)
  console.log(`  Announcer: ${config.explorer}/address/${announcerAddr}`)
  console.log(`  Registry:  ${config.explorer}/address/${registryAddr}`)
  console.log(`  Galeon:    ${config.explorer}/address/${galeonAddr}`)
  console.log(`  Tender:    ${config.explorer}/address/${tenderAddr}`)

  console.log(`\n📋 Update @galeon/stealth config.ts with:\n`)
  console.log(`  ${chainId}: {`)
  console.log(`    ...`)
  console.log(`    contracts: {`)
  console.log(`      announcer: '${announcerAddr}',`)
  console.log(`      registry: '${registryAddr}',`)
  console.log(`      galeon: '${galeonAddr}',`)
  console.log(`      tender: '${tenderAddr}',`)
  console.log(`    },`)
  console.log(`  },`)

  console.log(`\n🔍 Verify contracts:`)
  console.log(`  npx hardhat verify --network mantle ${announcerAddr}`)
  console.log(`  npx hardhat verify --network mantle ${registryAddr}`)
  console.log(
    `  npx hardhat verify --network mantle ${galeonAddr} ${announcerAddr} ${registryAddr}`
  )
  console.log(`  npx hardhat verify --network mantle ${tenderAddr}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
