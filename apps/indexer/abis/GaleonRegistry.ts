export const GaleonRegistryAbi = [
  // ReceiptAnchored - Payment recorded
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
  // PortRegistered - New port created
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
  // PortDeactivated - Port disabled
  {
    type: 'event',
    name: 'PortDeactivated',
    inputs: [
      { name: 'owner', type: 'address', indexed: true },
      { name: 'portId', type: 'bytes32', indexed: true },
    ],
  },
  // VerifiedBalanceConsumed - Balance consumed by privacy pool deposit
  {
    type: 'event',
    name: 'VerifiedBalanceConsumed',
    inputs: [
      { name: 'stealthAddress', type: 'address', indexed: true },
      { name: 'asset', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'consumer', type: 'address', indexed: true },
    ],
  },
  // PrivacyPoolAuthorized - Pool authorized/deauthorized
  {
    type: 'event',
    name: 'PrivacyPoolAuthorized',
    inputs: [
      { name: 'pool', type: 'address', indexed: true },
      { name: 'authorized', type: 'bool', indexed: false },
    ],
  },
  // StealthAddressFrozen - Address frozen/unfrozen for compliance
  {
    type: 'event',
    name: 'StealthAddressFrozen',
    inputs: [
      { name: 'stealthAddress', type: 'address', indexed: true },
      { name: 'frozen', type: 'bool', indexed: false },
    ],
  },
] as const
