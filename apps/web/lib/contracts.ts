/**
 * Contract ABIs and addresses for Galeon.
 *
 * Includes typed exports for use with wagmi hooks.
 */

import { type Abi } from 'viem'

/**
 * Contract addresses on Mantle Mainnet.
 */
export const CONTRACTS = {
  5000: {
    galeonRegistry: '0x9bcDb96a9Ff9b492e07f9E4909DF143266271e9D' as const,
    announcer: '0x8C04238c49e22EB687ad706bEe645698ccF41153' as const,
    registry: '0xE6586103756082bf3E43D3BB73f9fE479f0BDc22' as const,
  },
  5003: {
    galeonRegistry: '0x0000000000000000000000000000000000000000' as const,
    announcer: '0x0000000000000000000000000000000000000000' as const,
    registry: '0x0000000000000000000000000000000000000000' as const,
  },
} as const

/**
 * GaleonRegistry ABI - Main contract for payments and Port management.
 */
export const galeonRegistryAbi = [
  // Constants
  {
    type: 'function',
    name: 'SCHEME_ID',
    inputs: [],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  // Port management
  {
    type: 'function',
    name: 'registerPort',
    inputs: [
      { name: 'portId', type: 'bytes32' },
      { name: 'name', type: 'string' },
      { name: 'stealthMetaAddress', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'deactivatePort',
    inputs: [{ name: 'portId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPortMetaAddress',
    inputs: [{ name: 'portId', type: 'bytes32' }],
    outputs: [{ type: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'portOwners',
    inputs: [{ name: 'portId', type: 'bytes32' }],
    outputs: [{ type: 'address' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'portActive',
    inputs: [{ name: 'portId', type: 'bytes32' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  // Native payments
  {
    type: 'function',
    name: 'payNative',
    inputs: [
      { name: 'stealthAddress', type: 'address' },
      { name: 'ephemeralPubKey', type: 'bytes' },
      { name: 'viewTag', type: 'bytes1' },
      { name: 'receiptHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'payable',
  },
  // Token payments
  {
    type: 'function',
    name: 'payToken',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'stealthAddress', type: 'address' },
      { name: 'amount', type: 'uint256' },
      { name: 'ephemeralPubKey', type: 'bytes' },
      { name: 'viewTag', type: 'bytes1' },
      { name: 'receiptHash', type: 'bytes32' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  // Events
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
] as const satisfies Abi

/**
 * ERC5564Announcer ABI - Stealth payment announcements.
 */
export const announcerAbi = [
  {
    type: 'function',
    name: 'announce',
    inputs: [
      { name: 'schemeId', type: 'uint256' },
      { name: 'stealthAddress', type: 'address' },
      { name: 'ephemeralPubKey', type: 'bytes' },
      { name: 'metadata', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
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
] as const satisfies Abi

/**
 * ERC6538Registry ABI - Stealth meta-address registry.
 */
export const registryAbi = [
  {
    type: 'function',
    name: 'registerKeys',
    inputs: [
      { name: 'schemeId', type: 'uint256' },
      { name: 'stealthMetaAddress', type: 'bytes' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'stealthMetaAddressOf',
    inputs: [
      { name: 'registrant', type: 'address' },
      { name: 'schemeId', type: 'uint256' },
    ],
    outputs: [{ type: 'bytes' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'StealthMetaAddressSet',
    inputs: [
      { name: 'registrant', type: 'address', indexed: true },
      { name: 'schemeId', type: 'uint256', indexed: true },
      { name: 'stealthMetaAddress', type: 'bytes', indexed: false },
    ],
  },
] as const satisfies Abi

/**
 * Get contract addresses for a chain.
 */
export function getContractAddresses(chainId: number) {
  const addresses = CONTRACTS[chainId as keyof typeof CONTRACTS]
  if (!addresses) {
    throw new Error(`Unsupported chain: ${chainId}`)
  }
  return addresses
}
