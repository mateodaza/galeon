import { ethers } from 'hardhat'

/**
 * PoC Script: Deploy and test Groth16 verifier on Mantle
 * Tests BN254 precompiles (EIP-196/197) to confirm ZK proofs will work
 */

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
    name: 'Mantle Mainnet',
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
  console.log(`  Groth16 Verifier PoC`)
  console.log(`  Chain: ${config.name} (${chainId})`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // Deploy verifier
  console.log('1. Deploying Groth16Verifier (BN254 precompile tester)...')
  const Verifier = await ethers.getContractFactory('Groth16Verifier')
  const verifier = await Verifier.deploy()
  await verifier.waitForDeployment()
  const verifierAddr = await verifier.getAddress()
  console.log(`   ✓ Groth16Verifier: ${verifierAddr}`)

  // Test precompiles
  console.log('\n2. Testing BN254 precompiles...\n')

  try {
    console.log('   Testing ecAdd (EIP-196)...')
    const addTx = await verifier.testEcAdd()
    const addReceipt = await addTx.wait()
    const addGas = addReceipt?.gasUsed || 0n
    console.log(`   ✓ ecAdd works! Gas: ${addGas}`)
  } catch (e) {
    console.log(`   ✗ ecAdd FAILED: ${e}`)
  }

  try {
    console.log('   Testing ecMul (EIP-196)...')
    const mulTx = await verifier.testEcMul()
    const mulReceipt = await mulTx.wait()
    const mulGas = mulReceipt?.gasUsed || 0n
    console.log(`   ✓ ecMul works! Gas: ${mulGas}`)
  } catch (e) {
    console.log(`   ✗ ecMul FAILED: ${e}`)
  }

  try {
    console.log('   Testing pairing (EIP-197)...')
    const pairingTx = await verifier.testPairing()
    const pairingReceipt = await pairingTx.wait()
    const pairingGas = pairingReceipt?.gasUsed || 0n
    console.log(`   ✓ Pairing works! Gas: ${pairingGas}`)
  } catch (e) {
    console.log(`   ✗ Pairing FAILED: ${e}`)
  }

  // Run all tests and get results
  console.log('\n3. Running all precompile tests...')
  try {
    const result = await verifier.testAllPrecompiles.staticCall()
    console.log(`   ecAdd:   ${result.addOk ? '✓ PASS' : '✗ FAIL'}`)
    console.log(`   ecMul:   ${result.mulOk ? '✓ PASS' : '✗ FAIL'}`)
    console.log(`   pairing: ${result.pairingOk ? '✓ PASS' : '✗ FAIL'}`)

    if (result.addOk && result.mulOk && result.pairingOk) {
      console.log('\n   🎉 ALL PRECOMPILES WORK! Groth16 proofs will verify on Mantle!')
    } else {
      console.log('\n   ⚠️  Some precompiles failed. ZK proofs may not work.')
    }
  } catch (e) {
    console.log(`   ✗ Test failed: ${e}`)
  }

  // Summary
  console.log(`\n========================================`)
  console.log(`  PoC Complete!`)
  console.log(`========================================\n`)

  console.log(`Verifier Address: ${verifierAddr}`)
  console.log(`Explorer: ${config.explorer}/address/${verifierAddr}`)

  console.log(`\n🔍 Verify contract:`)
  console.log(
    `  npx hardhat verify --network ${chainId === 5000 ? 'mantle' : 'mantleSepolia'} ${verifierAddr}`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
