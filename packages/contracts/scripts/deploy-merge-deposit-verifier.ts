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

// Existing Pool addresses (update after deploy-pool.ts)
const POOL_ADDRESSES: Record<number, string> = {
  5003: '0x0000000000000000000000000000000000000000',
  5000: '0x11021e2C1BE35AcCFE9Aa33862Cfb7e54E2036Ef',
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
  console.log(`  Deploying MergeDepositVerifier`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // 1. Deploy MergeDepositVerifier
  console.log('1. Deploying MergeDepositVerifier...')
  const MergeDepositVerifier = await ethers.getContractFactory('MergeDepositVerifier')
  const verifier = await MergeDepositVerifier.deploy()
  await verifier.waitForDeployment()
  const verifierAddr = await verifier.getAddress()
  console.log(`   ✓ MergeDepositVerifier: ${verifierAddr}`)

  // 2. Set verifier on pool (if pool address is configured)
  const poolAddr = POOL_ADDRESSES[chainId]
  if (poolAddr !== '0x0000000000000000000000000000000000000000') {
    console.log('\n2. Setting MergeDepositVerifier on pool...')
    const pool = await ethers.getContractAt('GaleonPrivacyPoolSimple', poolAddr)

    // Check if we have permission (owner only)
    try {
      const tx = await pool.setMergeDepositVerifier(verifierAddr)
      await tx.wait()
      console.log(`   ✓ Verifier set on pool`)
    } catch {
      console.log(`   ⚠ Could not set verifier (may need owner permissions)`)
      console.log(`   Run manually: pool.setMergeDepositVerifier('${verifierAddr}')`)
    }
  } else {
    console.log('\n⚠ Pool address not configured. Update POOL_ADDRESSES and set verifier manually.')
  }

  // Summary
  console.log(`\n========================================`)
  console.log(`  MergeDepositVerifier Deployed!`)
  console.log(`========================================\n`)

  console.log(`Contract Address: ${verifierAddr}`)
  console.log(`Explorer: ${config.explorer}/address/${verifierAddr}`)

  const networkName = chainId === 5000 ? 'mantle' : 'mantleSepolia'
  console.log(`\n🔍 Verify contract:`)
  console.log(`  npx hardhat verify --network ${networkName} ${verifierAddr}`)

  if (poolAddr !== '0x0000000000000000000000000000000000000000') {
    console.log(`\n📋 If verifier was not auto-set, run:`)
    console.log(
      `  cast send ${poolAddr} "setMergeDepositVerifier(address)" ${verifierAddr} --private-key $PRIVATE_KEY`
    )
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
