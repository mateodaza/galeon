import { ethers } from 'hardhat'

/**
 * Deploy GaleonRegistry v2 with Privacy Pool support:
 * - Ownable (for setAuthorizedPool, setFrozenStealthAddress)
 * - verifiedBalance tracking
 * - authorizedPools mapping
 * - Port-only deposit validation
 *
 * Existing contracts (reused):
 * - ERC5564Announcer: 0x8C04238c49e22EB687ad706bEe645698ccF41153
 * - ERC6538Registry: 0xE6586103756082bf3E43D3BB73f9fE479f0BDc22
 */

interface ChainConfig {
  name: string
  explorer: string
  announcer: `0x${string}`
  erc6538Registry: `0x${string}`
  privacyPoolSimple: `0x${string}`
}

const CHAIN_CONFIGS: Record<number, ChainConfig> = {
  5000: {
    name: 'Mantle Mainnet',
    explorer: 'https://mantlescan.xyz',
    announcer: '0x8C04238c49e22EB687ad706bEe645698ccF41153',
    erc6538Registry: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22',
    privacyPoolSimple: '0x11021e2C1BE35AcCFE9Aa33862Cfb7e54E2036Ef',
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
  console.log(`  Deploying GaleonRegistry v2`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  console.log(`Using existing contracts:`)
  console.log(`  ERC5564Announcer: ${config.announcer}`)
  console.log(`  ERC6538Registry:  ${config.erc6538Registry}`)
  console.log(`  PrivacyPoolSimple: ${config.privacyPoolSimple}\n`)

  // 1. Deploy GaleonRegistry v2
  console.log('1. Deploying GaleonRegistry v2...')
  const GaleonRegistry = await ethers.getContractFactory('GaleonRegistry')
  const galeonRegistry = await GaleonRegistry.deploy(config.announcer, config.erc6538Registry)
  await galeonRegistry.waitForDeployment()
  const galeonRegistryAddr = await galeonRegistry.getAddress()
  console.log(`   ✓ GaleonRegistry v2: ${galeonRegistryAddr}`)

  // Verify owner
  const owner = await galeonRegistry.owner()
  console.log(`   ✓ Owner: ${owner}`)

  // 2. Set GaleonRegistry as trusted relayer on Announcer
  console.log('\n2. Setting GaleonRegistry as trusted relayer on ERC5564Announcer...')
  const announcer = await ethers.getContractAt('ERC5564Announcer', config.announcer)
  const setRelayerTx = await announcer.setTrustedRelayer(galeonRegistryAddr, true)
  await setRelayerTx.wait()
  console.log(`   ✓ GaleonRegistry is now a trusted relayer`)

  // 3. Authorize Privacy Pool on GaleonRegistry
  console.log('\n3. Authorizing Privacy Pool on GaleonRegistry...')
  const authPoolTx = await galeonRegistry.setAuthorizedPool(config.privacyPoolSimple, true)
  await authPoolTx.wait()
  console.log(`   ✓ Privacy Pool authorized: ${config.privacyPoolSimple}`)

  // 4. Update Privacy Pool to use new registry
  console.log('\n4. Updating Privacy Pool to use new GaleonRegistry...')
  const pool = await ethers.getContractAt('GaleonPrivacyPoolSimple', config.privacyPoolSimple)
  const setRegistryTx = await pool.setGaleonRegistry(galeonRegistryAddr)
  await setRegistryTx.wait()
  console.log(`   ✓ Privacy Pool now uses new GaleonRegistry`)

  // Summary
  console.log(`\n========================================`)
  console.log(`  Deployment Complete!`)
  console.log(`========================================\n`)

  console.log(`New Contract Address:`)
  console.log(`  GaleonRegistry v2: ${galeonRegistryAddr}`)

  console.log(`\nExplorer Link:`)
  console.log(`  ${config.explorer}/address/${galeonRegistryAddr}`)

  console.log(`\n📋 Update @galeon/stealth config.ts:`)
  console.log(`  galeon: '${galeonRegistryAddr}',`)

  console.log(`\n🔍 Verify contract:`)
  console.log(
    `  npx hardhat verify --network mantle ${galeonRegistryAddr} ${config.announcer} ${config.erc6538Registry}`
  )

  console.log(`\n✅ Post-deployment checklist:`)
  console.log(`  ✅ GaleonRegistry v2 deployed`)
  console.log(`  ✅ Set as trusted relayer on ERC5564Announcer`)
  console.log(`  ✅ Privacy Pool authorized`)
  console.log(`  ✅ Privacy Pool updated to use new registry`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
