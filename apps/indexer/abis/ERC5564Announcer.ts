export const ERC5564AnnouncerAbi = [
  {
    type: 'event',
    name: 'Announcement',
    inputs: [
      { name: 'schemeId', type: 'uint256', indexed: true },
      { name: 'stealthAddress', type: 'address', indexed: true },
      { name: 'caller', type: 'address', indexed: true },
      { name: 'ephemeralPubKey', type: 'bytes', indexed: false },
      { name: 'metadata', type: 'bytes', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TrustedRelayerUpdated',
    inputs: [
      { name: 'relayer', type: 'address', indexed: true },
      { name: 'trusted', type: 'bool', indexed: false },
    ],
  },
] as const
