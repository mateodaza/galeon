---
paths: apps/indexer/**/*.ts
---

# Indexer (Ponder)

Blockchain event indexing with webhooks to API.

## Structure

```
ponder.config.ts   # Chain + contract config
ponder.schema.ts   # GraphQL schema
src/index.ts       # Event handlers
```

## Rules

- Webhook to AdonisJS on new events
- Handle reorgs gracefully
- Index Announcement and ReceiptAnchored events
