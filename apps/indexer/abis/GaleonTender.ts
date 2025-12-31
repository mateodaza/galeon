export const GaleonTenderAbi = [
  {
    type: 'event',
    name: 'Forwarded',
    inputs: [
      { name: 'recipient', type: 'address', indexed: true },
      { name: 'token', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'stealthCount', type: 'uint256', indexed: false },
    ],
  },
] as const
