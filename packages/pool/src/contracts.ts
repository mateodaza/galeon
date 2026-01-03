/**
 * Pool Contracts
 *
 * Contract addresses and ABIs for Privacy Pool interactions.
 */

/**
 * Contract addresses for Privacy Pool (to be updated after deployment)
 */
export const POOL_CONTRACTS = {
  5000: {
    entrypoint: '0x54BA91d29f84B8bAd161880798877e59f2999f7a' as const,
    pool: '0x3260c8d8cc654B0897cd93cdf0662Fa679656b36' as const,
    withdrawalVerifier: '0x7529e3ec251A648A873F53d9969c1C05a44029A1' as const,
    ragequitVerifier: '0xFDb199E0aC8eC430541438aa6E63101F8C205D76' as const,
  },
  5003: {
    entrypoint: '0x0000000000000000000000000000000000000000' as const,
    pool: '0x0000000000000000000000000000000000000000' as const,
    withdrawalVerifier: '0x0000000000000000000000000000000000000000' as const,
    ragequitVerifier: '0x0000000000000000000000000000000000000000' as const,
  },
} as const

export type PoolChainId = keyof typeof POOL_CONTRACTS

/** Contract addresses for a chain */
export type PoolContracts = {
  entrypoint: `0x${string}`
  pool: `0x${string}`
  withdrawalVerifier: `0x${string}`
  ragequitVerifier: `0x${string}`
}

/**
 * GaleonEntrypoint ABI for deposits
 */
export const entrypointAbi = [
  {
    type: 'function',
    name: 'deposit',
    inputs: [{ name: '_precommitment', type: 'uint256' }],
    outputs: [{ name: '_commitment', type: 'uint256' }],
    stateMutability: 'payable',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'pool', type: 'address', indexed: true },
      { name: 'commitment', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const

/**
 * GaleonPrivacyPoolSimple ABI for pool operations
 */
export const poolAbi = [
  {
    type: 'function',
    name: 'SCOPE',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentRoot',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentTreeDepth',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentTreeSize',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'commitment', type: 'uint256', indexed: false },
      { name: 'label', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
      { name: 'precommitment', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: 'processooor', type: 'address', indexed: true },
      { name: 'withdrawn', type: 'uint256', indexed: false },
      { name: 'spentNullifier', type: 'uint256', indexed: false },
      { name: 'newCommitment', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Ragequit',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'commitment', type: 'uint256', indexed: false },
      { name: 'label', type: 'uint256', indexed: false },
      { name: 'value', type: 'uint256', indexed: false },
    ],
  },
] as const
