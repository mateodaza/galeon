import { ethers } from 'hardhat'

/**
 * Update Verifier in Storage
 *
 * Calls upgradeVerifiers() to update the WITHDRAWAL_VERIFIER in proxy storage.
 *
 * Run: npx hardhat run scripts/update-verifier-storage.ts --network mantle
 */

const POOL_PROXY = '0xE271335D1FCa02b6c219B9944f0a4921aFD559C0'
const NEW_WITHDRAWAL_VERIFIER = '0xB4Aa9aCC87a6B53F4F592d981e16132F239C4972'
const RAGEQUIT_VERIFIER = '0xAE1126645a26bC30B9A29D9c216e8F6B51B82803'

async function main() {
  console.log('\n========================================')
  console.log('  Update Verifier in Storage')
  console.log('========================================\n')

  const [deployer] = await ethers.getSigners()
  console.log(`Caller: ${deployer.address}`)

  const pool = await ethers.getContractAt('GaleonPrivacyPoolSimple', POOL_PROXY)

  console.log('\nBefore:')
  const oldVerifier = await pool.WITHDRAWAL_VERIFIER()
  console.log(`  WITHDRAWAL_VERIFIER: ${oldVerifier}`)

  console.log('\nCalling upgradeVerifiers()...')
  const tx = await pool.upgradeVerifiers(NEW_WITHDRAWAL_VERIFIER, RAGEQUIT_VERIFIER)
  console.log(`  Tx: ${tx.hash}`)
  await tx.wait()
  console.log('  ✓ Done')

  console.log('\nAfter:')
  const newVerifier = await pool.WITHDRAWAL_VERIFIER()
  console.log(`  WITHDRAWAL_VERIFIER: ${newVerifier}`)
  console.log(`  Expected:            ${NEW_WITHDRAWAL_VERIFIER}`)
  console.log(
    `  Match: ${newVerifier.toLowerCase() === NEW_WITHDRAWAL_VERIFIER.toLowerCase() ? '✓' : '✗'}`
  )

  console.log('\n========================================')
  console.log('  ✓ Verifier Updated!')
  console.log('========================================\n')
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
