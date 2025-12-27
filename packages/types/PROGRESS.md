# Types Package (packages/types) Progress

> Shared domain types for Galeon
> Last updated: 2025-12-27

## Setup

- [x] Initialize package
- [x] Set up TypeScript (tsup + tsc)
- [x] Configure package exports

## Common Primitives

- [x] common.ts - ISODateString, WeiString, Address, Bytes32Hex, CompressedPublicKeyHex, StealthMetaAddress

## Core Types

- [x] port.ts - Port, PortType, PortStatus, PortSummary, PortWithPending
- [x] user.ts - User, UserMode, UserProfile, Session
- [x] receipt.ts - Receipt, ReceiptStatus, Currency, ReceiptSummary, ReceiptVerification
- [x] payment.ts - CollectablePayment, Collection, CollectionBatch, PaymentRequest, PaymentResult
- [x] chain.ts - ChainConfig, SupportedChainId, TokenConfig, ContractAddresses, TxReceipt

## Serialization Fixes (Audit)

- [x] ISODateString for all API date fields (not Date)
- [x] WeiString for all amounts (not bigint)
- [x] Currency union used consistently (not plain string)
- [x] CompressedPublicKeyHex for ephemeral public keys (documented encoding)

## API Types

- [x] Auth - NonceRequest, VerifyRequest, AuthResponse
- [x] Port - CreatePortRequest, CreatePortResponse, ListPortsResponse
- [x] Receipt - ListReceiptsResponse, GetReceiptResponse, VerifyReceiptResponse
- [x] Payment - CreatePaymentRequest, CreatePaymentResponse
- [x] Collection - PreviewCollectionRequest, ExecuteCollectionRequest, GetCollectionStatusResponse
- [x] Dashboard - VendorDashboardResponse, UserDashboardResponse
- [x] Generic - ApiError, PaginationParams, PaginatedResponse

## Usage

```typescript
// Domain types
import type { Port, Receipt, User, Collection } from '@galeon/types'

// API types
import type { CreatePortRequest, AuthResponse, CollectionPreview } from '@galeon/types'
```

## Notes

This package contains only TypeScript types (no runtime code).
All types are re-exported from the main entry point.
