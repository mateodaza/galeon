import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { ethers } from 'hardhat'
import path from 'path'

/**
 * Regenerate Verifier from Actual ZKey
 *
 * 1. Exports verification key from withdraw_final.zkey
 * 2. Generates Solidity verifier from that key
 * 3. Deploys the new verifier
 * 4. Updates the pool to use it
 *
 * Run: npx hardhat run scripts/regenerate-verifier.ts --network mantle
 */

const POOL_PROXY = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'
const ZKEY_PATH = path.resolve(__dirname, '../../../apps/web/public/circuits/withdraw_final.zkey')
const TEMP_VKEY = '/tmp/withdraw_vkey.json'
const TEMP_VERIFIER = path.resolve(
  __dirname,
  '../contracts/privacy-pool/verifiers/WithdrawalVerifier_NEW.sol'
)

async function main() {
  console.log('\n========================================')
  console.log('  Regenerate Verifier from ZKey')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Deployer: ${deployer.address}`)

  // ==========================================
  // 1. Export verification key from zkey
  // ==========================================
  console.log('1. Exporting verification key from zkey...')
  console.log(`   ZKey: ${ZKEY_PATH}`)

  try {
    execSync(`npx snarkjs zkey export verificationkey "${ZKEY_PATH}" "${TEMP_VKEY}"`, {
      stdio: 'inherit',
    })
    console.log(`   ✓ Exported to ${TEMP_VKEY}`)
  } catch (e) {
    console.error('   Failed to export vkey. Make sure snarkjs is installed.')
    throw e
  }

  // ==========================================
  // 2. Generate Solidity verifier
  // ==========================================
  console.log('\n2. Generating Solidity verifier...')

  try {
    execSync(`npx snarkjs zkey export solidityverifier "${ZKEY_PATH}" "${TEMP_VERIFIER}"`, {
      stdio: 'inherit',
    })
    console.log(`   ✓ Generated ${TEMP_VERIFIER}`)
  } catch (e) {
    console.error('   Failed to generate verifier.')
    throw e
  }

  // ==========================================
  // 3. Fix the verifier contract
  // ==========================================
  console.log('\n3. Fixing verifier contract...')

  let verifierSource = readFileSync(TEMP_VERIFIER, 'utf8')

  // Fix pragma
  verifierSource = verifierSource.replace(/pragma solidity \^0\.6\.11;/, 'pragma solidity ^0.8.24;')

  // Fix contract name
  verifierSource = verifierSource.replace(
    /contract Groth16Verifier/,
    'contract WithdrawalVerifierFixed'
  )

  // Add interface
  verifierSource = verifierSource.replace(
    'pragma solidity ^0.8.24;',
    'pragma solidity ^0.8.24;\n\nimport {IVerifier} from "../interfaces/IVerifier.sol";'
  )

  writeFileSync(TEMP_VERIFIER, verifierSource)
  console.log('   ✓ Fixed pragma and contract name')

  // ==========================================
  // 4. Compile and deploy
  // ==========================================
  console.log('\n4. Compiling...')

  // Force recompile
  execSync('npx hardhat compile --force', {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
  })

  console.log('\n5. Deploying new verifier...')

  const NewVerifier = await ethers.getContractFactory('WithdrawalVerifierFixed')
  const newVerifier = await NewVerifier.deploy()
  await newVerifier.waitForDeployment()
  const verifierAddress = await newVerifier.getAddress()
  console.log(`   ✓ Deployed: ${verifierAddress}`)

  // ==========================================
  // 5. Update pool
  // ==========================================
  console.log('\n6. Updating pool verifier...')

  const pool = await ethers.getContractAt('GaleonPrivacyPoolSimple', POOL_PROXY)
  const tx = await pool.upgradeVerifiers(verifierAddress, RAGEQUIT_VERIFIER)
  await tx.wait()
  console.log('   ✓ Pool updated')

  // ==========================================
  // 6. Verify
  // ==========================================
  console.log('\n7. Verifying...')
  const actualVerifier = await pool.WITHDRAWAL_VERIFIER()
  console.log(`   WITHDRAWAL_VERIFIER: ${actualVerifier}`)
  console.log(
    `   Match: ${actualVerifier.toLowerCase() === verifierAddress.toLowerCase() ? '✓' : '✗'}`
  )

  // Also update the verification_key.json for consistency
  console.log('\n8. Updating verification_key.json...')
  const newVkey = readFileSync(TEMP_VKEY, 'utf8')
  const vkeyPath = path.resolve(
    __dirname,
    '../../../apps/web/public/circuits/verification_key.json'
  )
  writeFileSync(vkeyPath, newVkey)
  console.log(`   ✓ Updated ${vkeyPath}`)

  console.log('\n========================================')
  console.log('  ✓ Verifier Regenerated!')
  console.log('========================================')
  console.log(`\nNew verifier: ${verifierAddress}`)
  console.log('Try withdrawing again!')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
