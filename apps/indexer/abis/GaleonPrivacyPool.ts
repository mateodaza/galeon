export const GaleonPrivacyPoolAbi = [
  // Deposited - Pool-level deposit (has more detail than Entrypoint event)
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: '_depositor', type: 'address', indexed: true },
      { name: '_commitment', type: 'uint256', indexed: false },
      { name: '_label', type: 'uint256', indexed: false },
      { name: '_value', type: 'uint256', indexed: false },
      { name: '_precommitmentHash', type: 'uint256', indexed: false },
    ],
  },
  // Withdrawn - Private withdrawal processed
  {
    type: 'event',
    name: 'Withdrawn',
    inputs: [
      { name: '_processooor', type: 'address', indexed: true },
      { name: '_value', type: 'uint256', indexed: false },
      { name: '_spentNullifier', type: 'uint256', indexed: false },
      { name: '_newCommitment', type: 'uint256', indexed: false },
    ],
  },
  // MergeDeposited - Merge deposit into existing commitment
  {
    type: 'event',
    name: 'MergeDeposited',
    inputs: [
      { name: '_depositor', type: 'address', indexed: true },
      { name: '_depositValue', type: 'uint256', indexed: false },
      { name: '_existingNullifierHash', type: 'uint256', indexed: false },
      { name: '_newCommitmentHash', type: 'uint256', indexed: false },
    ],
  },
  // Ragequit - Emergency exit by original depositor
  {
    type: 'event',
    name: 'Ragequit',
    inputs: [
      { name: '_ragequitter', type: 'address', indexed: true },
      { name: '_commitment', type: 'uint256', indexed: false },
      { name: '_label', type: 'uint256', indexed: false },
      { name: '_value', type: 'uint256', indexed: false },
    ],
  },
  // PoolDied - Pool permanently stopped accepting deposits
  {
    type: 'event',
    name: 'PoolDied',
    inputs: [],
  },
  // VerifiersUpgraded - Circuit verifiers upgraded
  {
    type: 'event',
    name: 'VerifiersUpgraded',
    inputs: [
      { name: 'withdrawalVerifier', type: 'address', indexed: true },
      { name: 'ragequitVerifier', type: 'address', indexed: true },
      { name: 'newVersion', type: 'uint256', indexed: false },
    ],
  },
  // GaleonRegistrySet - Registry contract set
  {
    type: 'event',
    name: 'GaleonRegistrySet',
    inputs: [{ name: 'registry', type: 'address', indexed: true }],
  },
  // DepositorBlocklistUpdated - Depositor blocked/unblocked
  {
    type: 'event',
    name: 'DepositorBlocklistUpdated',
    inputs: [
      { name: 'depositor', type: 'address', indexed: true },
      { name: 'blocked', type: 'bool', indexed: false },
    ],
  },
  // LeafInserted - Merkle tree leaf added (from GaleonState)
  {
    type: 'event',
    name: 'LeafInserted',
    inputs: [
      { name: '_index', type: 'uint256', indexed: false },
      { name: '_leaf', type: 'uint256', indexed: false },
      { name: '_root', type: 'uint256', indexed: false },
    ],
  },
] as const
