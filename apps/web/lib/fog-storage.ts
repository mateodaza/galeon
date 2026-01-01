/**
 * Encrypted localStorage utilities for Fog Mode.
 *
 * Fog wallet metadata is stored encrypted using AES-256-GCM with a session key
 * derived from the user's master signature. Private keys are NEVER stored.
 */

import { keccak256Hash } from '@galeon/stealth'
import type { FogWalletMetadata, FogSessionStorage } from '@/types/fog'

// ============================================================
// Constants
// ============================================================

/** localStorage key prefix */
const STORAGE_KEY_PREFIX = 'galeon-fog-session'

/** Session duration: 7 days in milliseconds */
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

/** Current storage version for migrations */
const STORAGE_VERSION = 1

// ============================================================
// Key Derivation
// ============================================================

/**
 * Derive AES-256 session key from master signature.
 *
 * Uses keccak256 hash of the signature as the key material.
 * This ensures the key is deterministic from the same signature.
 *
 * @param masterSignature - User's master stealth signature
 * @returns 32-byte key as Uint8Array
 */
export function deriveSessionKeyBytes(masterSignature: `0x${string}`): Uint8Array {
  // Hash the signature to get 32 bytes for AES key
  return keccak256Hash(masterSignature)
}

/**
 * Import session key bytes as CryptoKey for Web Crypto API.
 *
 * @param keyBytes - 32-byte key material
 * @returns CryptoKey for AES-GCM operations
 */
async function importSessionKey(keyBytes: Uint8Array): Promise<CryptoKey> {
  // Create a new ArrayBuffer copy for TypeScript compatibility with Web Crypto
  const keyBuffer = new Uint8Array(keyBytes).buffer as ArrayBuffer
  return crypto.subtle.importKey('raw', keyBuffer, { name: 'AES-GCM' }, false, [
    'encrypt',
    'decrypt',
  ])
}

// ============================================================
// Encryption/Decryption
// ============================================================

/**
 * Encrypt fog wallet metadata using AES-256-GCM.
 *
 * @param data - Array of fog wallet metadata
 * @param sessionKeyBytes - 32-byte session key
 * @returns Object with encrypted data and nonce
 */
async function encryptMetadata(
  data: FogWalletMetadata[],
  sessionKeyBytes: Uint8Array
): Promise<{ encrypted: string; nonce: string }> {
  const key = await importSessionKey(sessionKeyBytes)

  // Generate random 12-byte nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12))

  // Convert data to JSON bytes
  const jsonStr = JSON.stringify(data)
  const dataBytes = new TextEncoder().encode(jsonStr)

  // Encrypt
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, dataBytes)

  return {
    encrypted: bytesToBase64(new Uint8Array(ciphertext)),
    nonce: bytesToBase64(nonce),
  }
}

/**
 * Decrypt fog wallet metadata using AES-256-GCM.
 *
 * @param encrypted - Base64 encrypted data
 * @param nonce - Base64 nonce
 * @param sessionKeyBytes - 32-byte session key
 * @returns Decrypted fog wallet metadata array
 */
async function decryptMetadata(
  encrypted: string,
  nonce: string,
  sessionKeyBytes: Uint8Array
): Promise<FogWalletMetadata[]> {
  const key = await importSessionKey(sessionKeyBytes)

  const ciphertext = base64ToBytes(encrypted)
  const ivBytes = base64ToBytes(nonce)

  // Decrypt (create copies for TypeScript compatibility with Web Crypto API)
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: new Uint8Array(ivBytes).buffer as ArrayBuffer },
    key,
    new Uint8Array(ciphertext).buffer as ArrayBuffer
  )

  // Parse JSON
  const jsonStr = new TextDecoder().decode(decrypted)
  return JSON.parse(jsonStr) as FogWalletMetadata[]
}

// ============================================================
// Storage Operations
// ============================================================

/**
 * Get storage key for a specific wallet address.
 */
function getStorageKey(address: string): string {
  return `${STORAGE_KEY_PREFIX}-${address.toLowerCase()}`
}

/**
 * Load fog wallets from encrypted localStorage.
 *
 * @param address - User's wallet address
 * @param sessionKeyBytes - 32-byte session key
 * @returns Array of fog wallet metadata (empty if none or expired)
 */
export async function loadFogWallets(
  address: string,
  sessionKeyBytes: Uint8Array
): Promise<FogWalletMetadata[]> {
  if (typeof window === 'undefined') return []

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) return []

    const session: FogSessionStorage = JSON.parse(stored)

    // Check expiration
    if (Date.now() >= session.expiresAt) {
      localStorage.removeItem(getStorageKey(address))
      return []
    }

    // Check version for migrations
    if (session.version !== STORAGE_VERSION) {
      // Future: handle migrations here
      console.warn('[Fog] Storage version mismatch, clearing data')
      localStorage.removeItem(getStorageKey(address))
      return []
    }

    // Decrypt
    return await decryptMetadata(session.encrypted, session.nonce, sessionKeyBytes)
  } catch (error) {
    console.error('[Fog] Failed to load fog wallets:', error)
    return []
  }
}

/**
 * Save fog wallets to encrypted localStorage.
 *
 * @param address - User's wallet address
 * @param wallets - Array of fog wallet metadata
 * @param sessionKeyBytes - 32-byte session key
 */
export async function saveFogWallets(
  address: string,
  wallets: FogWalletMetadata[],
  sessionKeyBytes: Uint8Array
): Promise<void> {
  if (typeof window === 'undefined') return

  try {
    const { encrypted, nonce } = await encryptMetadata(wallets, sessionKeyBytes)

    const session: FogSessionStorage = {
      encrypted,
      nonce,
      expiresAt: Date.now() + SESSION_DURATION_MS,
      version: STORAGE_VERSION,
    }

    localStorage.setItem(getStorageKey(address), JSON.stringify(session))
  } catch (error) {
    console.error('[Fog] Failed to save fog wallets:', error)
    throw error
  }
}

/**
 * Clear fog wallets from localStorage.
 *
 * @param address - User's wallet address
 */
export function clearFogWallets(address: string): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getStorageKey(address))
}

/**
 * Check if fog session exists and is valid.
 *
 * @param address - User's wallet address
 * @returns true if valid session exists
 */
export function hasFogSession(address: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const stored = localStorage.getItem(getStorageKey(address))
    if (!stored) return false

    const session: FogSessionStorage = JSON.parse(stored)
    return Date.now() < session.expiresAt
  } catch {
    return false
  }
}

// ============================================================
// Index Management
// ============================================================

/**
 * Get the next available fog index.
 * Finds the maximum existing index and adds 1.
 *
 * @param wallets - Existing fog wallets
 * @returns Next available index
 */
export function getNextFogIndex(wallets: FogWalletMetadata[]): number {
  if (wallets.length === 0) return 0
  const maxIndex = Math.max(...wallets.map((w) => w.fogIndex))
  return maxIndex + 1
}

/**
 * Generate a default name for a new fog wallet.
 *
 * @param wallets - Existing fog wallets
 * @returns Name like "Fog Wallet 1", "Fog Wallet 2", etc.
 */
export function generateDefaultName(wallets: FogWalletMetadata[]): string {
  const nextIndex = wallets.length + 1
  return `Fog Wallet ${nextIndex}`
}

// ============================================================
// Utility Functions
// ============================================================

/**
 * Convert hex string to Uint8Array.
 * Available for future use in storage operations.
 */
function _hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16)
  }
  return bytes
}

/**
 * Convert Uint8Array to Base64 string.
 */
function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

/**
 * Convert Base64 string to Uint8Array.
 */
function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Convert Uint8Array to hex string.
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}
