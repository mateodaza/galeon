/**
 * Contract ABIs for Galeon.
 *
 * Typed ABI definitions for use with viem/wagmi.
 */

import type { Abi } from 'viem'

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
  // Privacy Pool integration
  {
    type: 'function',
    name: 'isPortStealthAddress',
    inputs: [{ name: 'stealthAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'verifiedBalance',
    inputs: [
      { name: '_address', type: 'address' },
      { name: '_asset', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'canDeposit',
    inputs: [{ name: '_address', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'frozenStealthAddresses',
    inputs: [{ name: 'stealthAddress', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'authorizedPools',
    inputs: [{ name: 'pool', type: 'address' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
  // Native payments
  {
    type: 'function',
    name: 'payNative',
    inputs: [
      { name: 'portId', type: 'bytes32' },
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
      { name: 'portId', type: 'bytes32' },
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
 * GaleonEntrypoint ABI - Pool deposits entry.
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
    type: 'function',
    name: 'usedPrecommitments',
    inputs: [{ name: '_precommitment', type: 'uint256' }],
    outputs: [{ name: '_used', type: 'bool' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'assetConfig',
    inputs: [{ name: '_asset', type: 'address' }],
    outputs: [
      { name: 'pool', type: 'address' },
      { name: 'minimumDepositAmount', type: 'uint256' },
      { name: 'vettingFeeBPS', type: 'uint256' },
      { name: 'maxRelayFeeBPS', type: 'uint256' },
    ],
    stateMutability: 'view',
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
] as const satisfies Abi

/**
 * GaleonPrivacyPoolSimple ABI - Pool operations.
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
      { name: '_depositor', type: 'address', indexed: true },
      { name: '_commitment', type: 'uint256', indexed: false },
      { name: '_label', type: 'uint256', indexed: false },
      { name: '_value', type: 'uint256', indexed: false },
      { name: '_precommitmentHash', type: 'uint256', indexed: false },
    ],
  },
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
] as const satisfies Abi
