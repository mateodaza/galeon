import { describe, it, expect } from 'vitest'
import {
  derivePortKeys,
  derivePortKeysFromId,
  derivePortKeysVersioned,
  formatStealthMetaAddress,
  portIndexFromId,
  resolvePortKeys,
} from './index'

const SIG = ('0x' + 'ab'.repeat(65)) as `0x${string}`
const OTHER_SIG = ('0x' + 'cd'.repeat(65)) as `0x${string}`

/** Two on-chain Port IDs that share a v1 index (found by an external audit, 27 Oct 2026). */
const COLLIDING = ['0x' + '9329'.padStart(64, '0'), '0x' + '2c377'.padStart(64, '0')] as const
const SHARED_INDEX = 2425052110

/** v1 meta-addresses computed with the derivation as it was before v2 existed. */
const V1_PINNED: Record<string, string> = {
  [COLLIDING[0]]:
    'st:mnt:0x03fcb368dccec9f34946a37b8c53b9a3b0829063deb541373b409f28d7d85af93302be84efc935040f9803446be7231e7f18efcce245bd6bd30e7d0a67109a4e4279',
  '3f2b8c1e-5a4d-4e7f-9c21-7b6e0d9a1c55':
    'st:mnt:0x02186dbbbba5adaa5f6ae7a42696e53f8825dbb2304f6afd80e172a63337ed7fa502514d3323cb94f9c0f42ffdc8f51876069fe2fd920e9faac05cf599f3c4372ea9',
}

describe('v1: the 32-bit Port index (kept for existing Ports)', () => {
  it('reproduces the collision: two Port IDs share an index', () => {
    expect(portIndexFromId(COLLIDING[0])).toBe(SHARED_INDEX)
    expect(portIndexFromId(COLLIDING[1])).toBe(SHARED_INDEX)
  })

  it('so under v1 the two Ports get identical keys', () => {
    const a = derivePortKeysVersioned(SIG, COLLIDING[0], 1)
    const b = derivePortKeysVersioned(SIG, COLLIDING[1], 1)
    expect(a.stealthMetaAddress).toBe(b.stealthMetaAddress)
  })

  it('derives exactly the keys existing Ports were created with', () => {
    for (const [id, meta] of Object.entries(V1_PINNED)) {
      expect(derivePortKeysVersioned(SIG, id, 1).stealthMetaAddress).toBe(meta)
      expect(derivePortKeys(SIG, portIndexFromId(id)).stealthMetaAddress).toBe(meta)
    }
  })
})

describe('v2: the full Port ID', () => {
  it('gives the colliding pair different keys', () => {
    const a = derivePortKeysFromId(SIG, COLLIDING[0])
    const b = derivePortKeysFromId(SIG, COLLIDING[1])
    expect(a.stealthMetaAddress).not.toBe(b.stealthMetaAddress)
    expect(a.spendingPrivateKey).not.toEqual(b.spendingPrivateKey)
    expect(a.viewingPrivateKey).not.toEqual(b.viewingPrivateKey)
  })

  it('never coincides with the v1 keys of the same Port', () => {
    for (const id of [...COLLIDING, '3f2b8c1e-5a4d-4e7f-9c21-7b6e0d9a1c55']) {
      expect(derivePortKeysFromId(SIG, id).stealthMetaAddress).not.toBe(
        derivePortKeysVersioned(SIG, id, 1).stealthMetaAddress
      )
    }
  })

  it('is deterministic, and the case of a hex ID does not matter', () => {
    const id = '0x' + 'AbCdEf'.padStart(64, '0')
    const a = derivePortKeysFromId(SIG, id)
    expect(derivePortKeysFromId(SIG, id).stealthMetaAddress).toBe(a.stealthMetaAddress)
    expect(derivePortKeysFromId(SIG, id.toLowerCase()).stealthMetaAddress).toBe(
      a.stealthMetaAddress
    )
  })

  it('differs between master signatures', () => {
    expect(derivePortKeysFromId(SIG, COLLIDING[0]).stealthMetaAddress).not.toBe(
      derivePortKeysFromId(OTHER_SIG, COLLIDING[0]).stealthMetaAddress
    )
  })

  it('rejects an empty Port ID', () => {
    expect(() => derivePortKeysFromId(SIG, '')).toThrow()
  })
})

describe('resolvePortKeys: the version a Port was created with', () => {
  it('finds v2 for a Port created with v2', () => {
    const meta = derivePortKeysFromId(SIG, COLLIDING[0]).stealthMetaAddress
    const found = resolvePortKeys(SIG, COLLIDING[0], meta)
    expect(found?.version).toBe(2)
    expect(found?.keys.stealthMetaAddress).toBe(meta)
  })

  it('finds v1 for a Port created before v2, with the keys it had', () => {
    const found = resolvePortKeys(SIG, COLLIDING[0], V1_PINNED[COLLIDING[0]])
    expect(found?.version).toBe(1)
    expect(found?.keys.stealthMetaAddress).toBe(V1_PINNED[COLLIDING[0]])
  })

  it('ignores the chain prefix of the stored meta-address', () => {
    const keys = derivePortKeysFromId(SIG, COLLIDING[1])
    const asEth = formatStealthMetaAddress(keys.spendingPublicKey, keys.viewingPublicKey, 'eth')
    expect(resolvePortKeys(SIG, COLLIDING[1], asEth)?.version).toBe(2)
  })

  it('returns null for another wallet', () => {
    const meta = derivePortKeysFromId(SIG, COLLIDING[0]).stealthMetaAddress
    expect(resolvePortKeys(OTHER_SIG, COLLIDING[0], meta)).toBeNull()
  })
})
