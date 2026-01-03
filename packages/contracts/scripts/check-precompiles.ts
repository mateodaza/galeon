import { ethers } from 'hardhat'

/**
 * Deploy PrecompileChecker and test BN254 precompiles on Mantle
 */

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  console.log(`\n========================================`)
  console.log(`  BN254 Precompile Deep Check`)
  console.log(`  Chain: ${chainId}`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  // Deploy checker
  console.log('Deploying PrecompileChecker...')
  const Checker = await ethers.getContractFactory('PrecompileChecker')
  const checker = await Checker.deploy()
  await checker.waitForDeployment()
  console.log(`Checker: ${await checker.getAddress()}\n`)

  // Test ecAdd
  console.log('Testing ecAdd (0x06)...')
  try {
    const result = await checker.checkEcAdd()
    console.log(`  success: ${result.success}`)
    console.log(`  rx: ${result.rx}`)
    console.log(`  ry: ${result.ry}`)
    // Expected result for G1 + G1 = 2*G1:
    // rx = 0x030644e72e131a029b85045b68181585d97816a916871ca8d3c208c16d87cfd3
    // ry = 0x15ed738c0e0a7c92e7845f96b2ae9c0a68a6a449e3538fc7ff3ebf7a5a18a2c4
    if (result.success) {
      console.log(`  ✓ ecAdd precompile works!`)
    }
  } catch (e: unknown) {
    console.log(`  ✗ ecAdd failed: ${(e as Error).message}`)
  }

  // Test ecMul
  console.log('\nTesting ecMul (0x07)...')
  try {
    const result = await checker.checkEcMul()
    console.log(`  success: ${result.success}`)
    console.log(`  rx: ${result.rx}`)
    console.log(`  ry: ${result.ry}`)
    if (result.success) {
      console.log(`  ✓ ecMul precompile works!`)
    }
  } catch (e: unknown) {
    console.log(`  ✗ ecMul failed: ${(e as Error).message}`)
  }

  // Test empty pairing (should return 1)
  console.log('\nTesting empty pairing (should return 1)...')
  try {
    const result = await checker.checkEmptyPairing()
    console.log(`  success: ${result.success}`)
    console.log(`  result: ${result.result}`)
    if (
      result.success &&
      result.result === '0x0000000000000000000000000000000000000000000000000000000000000001'
    ) {
      console.log(`  ✓ Empty pairing returns 1!`)
    } else if (result.success) {
      console.log(`  ⚠️  Pairing responded but returned ${result.result}`)
    } else {
      console.log(`  ✗ Pairing precompile not working`)
    }
  } catch (e: unknown) {
    console.log(`  ✗ Empty pairing failed: ${(e as Error).message}`)
  }

  // Test full pairing
  console.log('\nTesting full pairing e(G1,G2)*e(-G1,G2)=1...')
  try {
    const result = await checker.checkPairingPrecompile()
    console.log(`  exists: ${result.exists}`)
    console.log(`  success: ${result.success}`)
    console.log(`  result: ${result.result}`)
    if (
      result.exists &&
      result.success &&
      result.result === '0x0000000000000000000000000000000000000000000000000000000000000001'
    ) {
      console.log(`  ✓ PAIRING PRECOMPILE WORKS!`)
      console.log(`\n🎉 Groth16 ZK proofs should work on Mantle!`)
    } else if (result.exists) {
      console.log(`  ⚠️  Pairing precompile exists but returned unexpected result`)
    } else {
      console.log(`  ✗ Pairing precompile does NOT exist or is disabled`)
    }
  } catch (e: unknown) {
    console.log(`  ✗ Full pairing failed: ${(e as Error).message}`)
  }

  console.log('\n========================================')
  console.log('  Test Complete')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
