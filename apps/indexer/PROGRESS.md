# Indexer (apps/indexer) Progress

> Ponder blockchain indexer
> Last updated: 2025-12-31

## Current Status: DONE

Ponder indexer fully implemented with event handlers, schema, and REST API.

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

## Setup Tasks

- [x] Initialize Ponder project
- [x] Configure RPC (env: `PONDER_RPC_URL_5000`)
- [x] Set deployment block to `89365202`
- [ ] Set up webhook to AdonisJS backend (deferred - using direct DB access)

## Schema

- [x] Define `announcements` table (from ERC5564 Announcement events)
- [x] Define `receiptsAnchored` table (from ReceiptAnchored events)
- [x] Define `ports` table (from PortRegistered events)
- [x] Add indexes for viewTag, stealthAddress, caller, receiptHash

## Event Handlers

- [x] Handle `Announcement` events -> parse metadata, extract viewTag + receiptHash
- [x] Handle `ReceiptAnchored` events -> store payment receipts
- [x] Handle `PortRegistered` events -> track vendor ports
- [x] Handle `PortDeactivated` events -> mark ports inactive

## REST API Endpoints

| Method | Path                              | Description                         |
| ------ | --------------------------------- | ----------------------------------- |
| GET    | `/announcements`                  | List announcements with filters     |
| GET    | `/announcements/by-view-tag/:tag` | Filter by viewTag for fast scan     |
| GET    | `/ports`                          | List ports with owner/active filter |
| GET    | `/ports/:id`                      | Get single port by ID               |
| GET    | `/receipts`                       | List receipts with filters          |
| GET    | `/receipts/:receiptHash`          | Get receipt by hash                 |

## Tests

- [x] Indexing logic tests (`tests/indexing.test.ts`)
- [x] Utility function tests (`tests/utils.test.ts`)

## Architecture Decision

Using **direct DB access** from backend instead of webhooks:

- Backend connects to Ponder's PostgreSQL database
- Sync job polls for new events
- Simpler architecture, fewer failure points

See [BACKEND-PONDER-PLAN.md](../../docs/BACKEND-PONDER-PLAN.md) for full architecture.
