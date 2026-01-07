/**
 * Update ASP Root
 *
 * Updates the on-chain ASP root to include a specific label.
 * For hackathon testing - in production, ASP service handles this.
 *
 * Usage:
 *   npx hardhat run scripts/update-asp-root.ts --network mantle
 *
 * Or with a specific label:
 *   LABEL=0x123... npx hardhat run scripts/update-asp-root.ts --network mantle
 */

import { ethers } from 'hardhat'

// Poseidon hash implementation using the contract's library
async function _poseidonHash(inputs: bigint[]): Promise<bigint> {
  // For a single input, we need to use the LeanIMT hash which is Poseidon(left, right)
  // For a single leaf tree, the root is just the leaf itself
  if (inputs.length === 1) {
    return inputs[0]
  }

  // For 2 inputs, deploy a helper or use existing poseidon
  const poseidonT3 = await ethers.getContractFactory('PoseidonT3')
  const poseidon = await poseidonT3.deploy()
  await poseidon.waitForDeployment()

  const result = await poseidon.hash([inputs[0], inputs[1]])
  return BigInt(result.toString())
}

async function main() {
  const [deployer] = await ethers.getSigners()
  console.log('Updating ASP root with account:', deployer.address)

  // Get entrypoint address from environment or hardcoded
  const ENTRYPOINT_ADDRESS = process.env.ENTRYPOINT_ADDRESS || '0xYourEntrypointAddress'

  if (ENTRYPOINT_ADDRESS === '0xYourEntrypointAddress') {
    console.error('Please set ENTRYPOINT_ADDRESS environment variable')
    process.exit(1)
  }

  // Get the label to add to ASP tree
  const label = process.env.LABEL
  if (!label) {
    console.error('Please set LABEL environment variable')
    console.log(
      'Example: LABEL=0x123... npx hardhat run scripts/update-asp-root.ts --network mantle'
    )
    process.exit(1)
  }

  console.log('Label to include:', label)

  // For a single-leaf tree, the root IS the leaf (no siblings)
  // LeanIMT with depth 0 has root = leaf
  const aspRoot = BigInt(label)

  console.log('Computed ASP root:', aspRoot.toString())

  // Connect to entrypoint
  const entrypoint = await ethers.getContractAt('GaleonEntrypoint', ENTRYPOINT_ADDRESS)

  // Check current root
  try {
    const currentRoot = await entrypoint.latestRoot()
    console.log('Current on-chain ASP root:', currentRoot.toString())
  } catch {
    console.log('No ASP root set yet')
  }

  // Update the root
  // IPFS CID is a placeholder - in production this would point to the actual tree data
  const PLACEHOLDER_IPFS_CID = 'bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi'

  console.log('Updating ASP root...')
  const tx = await entrypoint.updateRoot(aspRoot, PLACEHOLDER_IPFS_CID)
  await tx.wait()

  console.log('✓ ASP root updated!')
  console.log('  New root:', aspRoot.toString())
  console.log('  Tx hash:', tx.hash)

  // Verify
  const newRoot = await entrypoint.latestRoot()
  console.log('  Verified on-chain root:', newRoot.toString())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
