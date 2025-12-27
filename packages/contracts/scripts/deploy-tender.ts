import { ethers } from 'hardhat'

async function main() {
  const network = await ethers.provider.getNetwork()
  const chainId = Number(network.chainId)

  console.log(`\n========================================`)
  console.log(`  Deploying GaleonTender`)
  console.log(`  Chain ID: ${chainId}`)
  console.log(`========================================\n`)

  const [deployer] = await ethers.getSigners()
  const balance = await ethers.provider.getBalance(deployer.address)

  console.log(`Deployer: ${deployer.address}`)
  console.log(`Balance: ${ethers.formatEther(balance)} MNT\n`)

  // Deploy GaleonTender
  console.log('Deploying GaleonTender...')
  const GaleonTender = await ethers.getContractFactory('GaleonTender')
  const tender = await GaleonTender.deploy()
  await tender.waitForDeployment()
  const tenderAddr = await tender.getAddress()
  console.log(`✓ GaleonTender: ${tenderAddr}`)

  console.log(`\n🔍 Verify:`)
  console.log(`  npx hardhat verify --network mantle ${tenderAddr}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
