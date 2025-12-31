export const GaleonRegistryAbi = [
  {
    type: 'event',
    name: 'ReceiptAnchored',
    inputs: [
      { name: 'stealthAddress', type: 'address', indexed: true },
      { name: 'receiptHash', type: 'bytes32', indexed: true },
      { name: 'payer', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'token', type: 'address', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PortRegistered',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'portId', type: 'bytes32', indexed: true },
      { name: 'name', type: 'string', indexed: false },
      { name: 'stealthMetaAddress', type: 'bytes', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PortDeactivated',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'portId', type: 'bytes32', indexed: true },
    ],
  },
] as const
