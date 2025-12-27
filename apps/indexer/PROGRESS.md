# Indexer (apps/indexer) Progress

> Ponder blockchain indexer
> Last updated: 2025-12-27

## Current Status: NOT STARTED

Frontend currently reads events directly from chain via `apps/web/hooks/use-collection.ts`. This works for the hackathon demo but would be slow at scale. Ponder would provide:

- Faster event queries (indexed database vs full chain scan)
- API for backend to query payments
- Webhook notifications for real-time updates

## Contracts on Mantle Mainnet (Chain ID: 5000)

| Contract         | Address                                      | Events                              |
| ---------------- | -------------------------------------------- | ----------------------------------- |
| ERC5564Announcer | `0x8C04238c49e22EB687ad706bEe645698ccF41153` | `Announcement`                      |
| ERC6538Registry  | `0xE6586103756082bf3E43D3BB73f9fE479f0BDc22` | `StealthMetaAddressSet`             |
| GaleonRegistry   | `0x85F23B63E2a40ba74cD418063c43cE19bcbB969C` | `PortRegistered`, `ReceiptAnchored` |
| GaleonTender     | `0x29D52d01947d91e241e9c7A4312F7463199e488c` | (not used yet)                      |

**Deployment Block:** `89365202` (start indexing from here)

## Example Transactions (Mainnet)

| Event                                    | Tx Hash                                                              | Mantlescan                                                                                           |
| ---------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| PortRegistered                           | `0x3e4bdd0e91a30a27ddbe8b26c4935cbc283f68d44fa8c26a03df9b3b75500497` | [View](https://mantlescan.xyz/tx/0x3e4bdd0e91a30a27ddbe8b26c4935cbc283f68d44fa8c26a03df9b3b75500497) |
| Payment (Announcement + ReceiptAnchored) | `0x9b05e34856ebf7ea130206d648b1fdc348076b8aff8eeed5a7e1ddc4fc50c528` | [View](https://mantlescan.xyz/tx/0x9b05e34856ebf7ea130206d648b1fdc348076b8aff8eeed5a7e1ddc4fc50c528) |

**Note:** Collection transactions are simple MNT transfers from stealth address to main wallet - no events emitted.

## Events to Index

### 1. Announcement (ERC5564Announcer)

Emitted when a payment is made to a stealth address.

```solidity
event Announcement(
    uint256 indexed schemeId,      // Always 1 for secp256k1
    address indexed stealthAddress,// Generated stealth address
    address indexed caller,        // Payer address
    bytes ephemeralPubKey,         // 33-byte compressed pubkey
    bytes metadata                 // View tag (1 byte) + extra data
);
```

### 2. ReceiptAnchored (GaleonRegistry)

Emitted alongside Announcement for Galeon-specific receipt tracking.

```solidity
event ReceiptAnchored(
    bytes32 indexed receiptHash,   // keccak256 of memo
    address indexed stealthAddress,// Same as Announcement
    uint256 amount,                // Payment amount in wei
    address token                  // 0x0 for native MNT
);
```

### 3. PortRegistered (GaleonRegistry)

Emitted when a vendor creates a new Port.

```solidity
event PortRegistered(
    bytes32 indexed portId,        // Deterministic port identifier
    address indexed owner,         // Vendor wallet address
    bytes stealthMetaAddress       // 66-byte stealth meta-address
);
```

## Setup Tasks

- [ ] Initialize Ponder project
- [ ] Configure Alchemy RPC (key in `.env`: `NEXT_PUBLIC_ALCHEMY_API_KEY`)
- [ ] Set deployment block to `89365202`
- [ ] Set up webhook to AdonisJS backend

## Schema

- [ ] Define `Announcement` entity
- [ ] Define `Receipt` entity (from ReceiptAnchored)
- [ ] Define `Port` entity

## Event Handlers

- [ ] Handle `Announcement` events -> store for wallet scanning
- [ ] Handle `ReceiptAnchored` events -> link to announcements
- [ ] Handle `PortRegistered` events -> track vendor ports

## Webhook (POST to AdonisJS)

- [ ] POST `/api/webhook/announcement` on new payments
- [ ] POST `/api/webhook/port` on new port registrations
- [ ] Include all event data + block metadata
- [ ] Handle failures gracefully (retry queue)

## Notes

### How the frontend currently works (without Ponder)

1. User goes to `/collect` page
2. Frontend calls `publicClient.getLogs()` from block 89365202 to latest
3. Scans ALL Announcement events (could be slow at scale)
4. Uses viewing key to filter for payments addressed to user
5. Gets balance of each stealth address
6. Collects funds via direct transfer

### What Ponder would improve

1. Pre-index all Announcement events in a database
2. API endpoint: `GET /announcements?caller=0x...` for specific payers
3. API endpoint: `GET /receipts?portId=0x...` for specific ports
4. Webhook to notify backend of new payments in real-time
5. Much faster queries for the frontend
