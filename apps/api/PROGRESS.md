# Backend (apps/api) Progress

> AdonisJS 6 API server
> Last updated: 2025-12-27

## Setup

- [ ] Initialize AdonisJS 6
- [ ] Configure PostgreSQL (Lucid)
- [ ] Configure Redis
- [ ] Set up Transmit SSE
- [ ] Set up adonisjs-jobs (BullMQ)

## Models & Migrations

- [ ] User model + migration
- [ ] Port model + migration
- [ ] Receipt model + migration

## Controllers

- [ ] AuthController (SIWE)
- [ ] PortsController
- [ ] ReceiptsController
- [ ] CollectionController
- [ ] WebhooksController (Ponder)

## Services

- [ ] SiweService
- [ ] StealthService
- [ ] CollectionService
- [ ] RelayerService

## Validators

- [ ] Auth validators
- [ ] Port validators
- [ ] Receipt validators

## Jobs

- [ ] ProcessPayment
- [ ] ScanPort
- [ ] FetchFxRate
- [ ] ReconcilePayments
- [ ] MonitorRelayer

## Middleware

- [ ] AuthMiddleware
- [ ] RateLimitMiddleware

## Notes

<!-- Add implementation notes, blockers, decisions here -->
