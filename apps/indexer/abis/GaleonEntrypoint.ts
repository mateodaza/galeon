export const GaleonEntrypointAbi = [
  // RootUpdated - ASP root updates
  {
    type: 'event',
    name: 'RootUpdated',
    inputs: [
      { name: '_root', type: 'uint256', indexed: false },
      { name: '_ipfsCID', type: 'string', indexed: false },
      { name: '_timestamp', type: 'uint256', indexed: false },
    ],
  },
  // Deposited - Entrypoint-level deposit tracking
  {
    type: 'event',
    name: 'Deposited',
    inputs: [
      { name: '_depositor', type: 'address', indexed: true },
      { name: '_pool', type: 'address', indexed: true },
      { name: '_commitment', type: 'uint256', indexed: false },
      { name: '_amount', type: 'uint256', indexed: false },
    ],
  },
  // WithdrawalRelayed - Withdrawal through relay
  {
    type: 'event',
    name: 'WithdrawalRelayed',
    inputs: [
      { name: '_relayer', type: 'address', indexed: true },
      { name: '_recipient', type: 'address', indexed: true },
      { name: '_asset', type: 'address', indexed: true },
      { name: '_amount', type: 'uint256', indexed: false },
      { name: '_feeAmount', type: 'uint256', indexed: false },
    ],
  },
  // FeesWithdrawn - Protocol fees withdrawn
  {
    type: 'event',
    name: 'FeesWithdrawn',
    inputs: [
      { name: '_asset', type: 'address', indexed: false },
      { name: '_recipient', type: 'address', indexed: false },
      { name: '_amount', type: 'uint256', indexed: false },
    ],
  },
  // PoolWindDown - Pool deposits halted
  {
    type: 'event',
    name: 'PoolWindDown',
    inputs: [{ name: '_pool', type: 'address', indexed: false }],
  },
  // PoolRegistered - New pool added
  {
    type: 'event',
    name: 'PoolRegistered',
    inputs: [
      { name: '_pool', type: 'address', indexed: false },
      { name: '_asset', type: 'address', indexed: false },
      { name: '_scope', type: 'uint256', indexed: false },
    ],
  },
  // PoolRemoved - Pool removed from registry
  {
    type: 'event',
    name: 'PoolRemoved',
    inputs: [
      { name: '_pool', type: 'address', indexed: false },
      { name: '_asset', type: 'address', indexed: false },
      { name: '_scope', type: 'uint256', indexed: false },
    ],
  },
  // PoolConfigurationUpdated - Pool config changed
  {
    type: 'event',
    name: 'PoolConfigurationUpdated',
    inputs: [
      { name: '_pool', type: 'address', indexed: false },
      { name: '_asset', type: 'address', indexed: false },
      { name: '_newMinimumDepositAmount', type: 'uint256', indexed: false },
      { name: '_newVettingFeeBPS', type: 'uint256', indexed: false },
      { name: '_newMaxRelayFeeBPS', type: 'uint256', indexed: false },
    ],
  },
] as const
