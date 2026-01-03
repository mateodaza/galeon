import { ethers } from 'hardhat'

/**
 * Test script: Check BN254 precompiles on existing deployed verifier
 * Uses staticCall to test without gas issues
 */

const VERIFIER_ADDRESS = '0xc1ad40759b9F7F9763f5DF9D3F942Dd10B312FC1'

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  console.log(`\n========================================`)
  console.log(`  Testing BN254 Precompiles`)
  console.log(`  Chain: ${chainId}`)
  console.log(`  Verifier: ${VERIFIER_ADDRESS}`)
  console.log(`========================================\n`)

  const Verifier = await ethers.getContractFactory('Groth16Verifier')
  const verifier = Verifier.attach(VERIFIER_ADDRESS)

  // Test with staticCall (no gas limit issues)
  console.log('Testing precompiles with staticCall...\n')

  try {
    const addResult = await verifier.testEcAdd.staticCall()
    console.log(`ecAdd:   ${addResult ? '✓ PASS' : '✗ FAIL'}`)
  } catch (e: unknown) {
    console.log(`ecAdd:   ✗ FAIL - ${(e as Error).message}`)
  }

  try {
    const mulResult = await verifier.testEcMul.staticCall()
    console.log(`ecMul:   ${mulResult ? '✓ PASS' : '✗ FAIL'}`)
  } catch (e: unknown) {
    console.log(`ecMul:   ✗ FAIL - ${(e as Error).message}`)
  }

  try {
    const pairingResult = await verifier.testPairing.staticCall()
    console.log(`pairing: ${pairingResult ? '✓ PASS' : '✗ FAIL'}`)
  } catch (e: unknown) {
    console.log(`pairing: ✗ FAIL - ${(e as Error).message}`)
  }

  // Test all at once
  console.log('\nRunning testAllPrecompiles()...')
  try {
    const result = await verifier.testAllPrecompiles.staticCall()
    console.log(`\nResults:`)
    console.log(`  ecAdd:   ${result.addOk ? '✓ PASS' : '✗ FAIL'}`)
    console.log(`  ecMul:   ${result.mulOk ? '✓ PASS' : '✗ FAIL'}`)
    console.log(`  pairing: ${result.pairingOk ? '✓ PASS' : '✗ FAIL'}`)

    if (result.addOk && result.mulOk && result.pairingOk) {
      console.log('\n🎉 ALL PRECOMPILES WORK!')
    } else {
      console.log('\n⚠️  Some precompiles failed.')
    }
  } catch (e: unknown) {
    console.log(`\n✗ testAllPrecompiles failed: ${(e as Error).message}`)
  }

  // Estimate gas for pairing
  console.log('\nEstimating gas for operations...')
  try {
    const addGas = await verifier.testEcAdd.estimateGas()
    console.log(`  ecAdd gas estimate: ${addGas}`)
  } catch (e: unknown) {
    console.log(`  ecAdd gas estimate: FAILED - ${(e as Error).message}`)
  }

  try {
    const mulGas = await verifier.testEcMul.estimateGas()
    console.log(`  ecMul gas estimate: ${mulGas}`)
  } catch (e: unknown) {
    console.log(`  ecMul gas estimate: FAILED - ${(e as Error).message}`)
  }

  try {
    const pairingGas = await verifier.testPairing.estimateGas()
    console.log(`  pairing gas estimate: ${pairingGas}`)
  } catch (e: unknown) {
    console.log(`  pairing gas estimate: FAILED - ${(e as Error).message}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
