/**
 * Pool Cryptography
 *
 * Poseidon hash functions for Privacy Pool commitments.
 * Uses maci-crypto which is browser-only (dynamic import for SSR).
 *
 * NOTE: This module only works in browser context.
 * For Node.js/SSR, use @galeon/stealth directly for key derivation.
 */

/** BN254 scalar field size (snark field) */
export const SNARK_SCALAR_FIELD = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
)

/**
 * Lazy-loaded Poseidon hash function.
 * Uses dynamic import to ensure browser/SSR compatibility.
 */
let poseidonFn: ((inputs: bigint[]) => bigint) | null = null

// Type declaration for maci-crypto hashing module
type MaciCryptoHashing = {
  poseidon: (inputs: bigint[]) => bigint
}

/**
 * Get the Poseidon hash function (browser-only).
 *
 * @throws Error if called in SSR/Node.js context
 */
export async function getPoseidon(): Promise<(inputs: bigint[]) => bigint> {
  if (poseidonFn) return poseidonFn

  // Dynamic import for SSR compatibility - only runs in browser
  if (typeof window === 'undefined') {
    throw new Error('Poseidon hash is only available in browser context')
  }

  // Import poseidon from maci-crypto's hashing module
  const hashing = (await import('maci-crypto/build/ts/hashing')) as MaciCryptoHashing
  poseidonFn = hashing.poseidon
  return poseidonFn
}

/**
 * Hash inputs using Poseidon (browser-only).
 *
 * @param inputs - Array of bigint values to hash
 * @returns Poseidon hash of inputs
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon()
  return poseidon(inputs)
}

/**
 * Convert bytes to bigint, clamped to snark field.
 *
 * @param bytes - Uint8Array to convert
 * @returns bigint value mod SNARK_SCALAR_FIELD
 */
export function bytesToFieldElement(bytes: Uint8Array): bigint {
  let result = BigInt(0)
  for (let i = 0; i < bytes.length; i++) {
    result = (result << BigInt(8)) | BigInt(bytes[i])
  }
  return result % SNARK_SCALAR_FIELD
}

/**
 * Compute the withdrawal context for ZK proof.
 * Must match contract: keccak256(abi.encode(withdrawal, SCOPE)) % SNARK_SCALAR_FIELD
 *
 * @param withdrawal - The withdrawal struct { processooor, data }
 * @param scope - The pool scope
 * @returns Context value as bigint
 */
export async function computeWithdrawalContext(
  withdrawal: { processooor: `0x${string}`; data: `0x${string}` },
  scope: bigint
): Promise<bigint> {
  // Dynamic import for viem (browser/node compatible)
  const { keccak256, encodeAbiParameters } = await import('viem')

  const encoded = encodeAbiParameters(
    [
      {
        name: 'withdrawal',
        type: 'tuple',
        components: [
          { name: 'processooor', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
      { name: 'scope', type: 'uint256' },
    ],
    [{ processooor: withdrawal.processooor, data: withdrawal.data }, scope]
  )

  const hash = keccak256(encoded)
  return BigInt(hash) % SNARK_SCALAR_FIELD
}

/**
 * Compute the merge deposit context for ZK proof.
 * Must match contract: keccak256(abi.encode(mergeData, SCOPE)) % SNARK_SCALAR_FIELD
 *
 * @param mergeData - The encoded merge data (e.g., abi.encode(depositor))
 * @param scope - The pool scope
 * @returns Context value as bigint
 */
export async function computeMergeDepositContext(
  mergeData: `0x${string}`,
  scope: bigint
): Promise<bigint> {
  const { keccak256, encodeAbiParameters } = await import('viem')

  const encoded = encodeAbiParameters(
    [
      { name: 'mergeData', type: 'bytes' },
      { name: 'scope', type: 'uint256' },
    ],
    [mergeData, scope]
  )

  const hash = keccak256(encoded)
  return BigInt(hash) % SNARK_SCALAR_FIELD
}
