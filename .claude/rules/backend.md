---
paths: apps/api/**/*.ts
---

# Backend (AdonisJS 6)

- Lucid ORM for database
- VineJS for validation
- Transmit for SSE
- adonisjs-jobs (BullMQ) for background work

## Structure

```
app/controllers/   # Thin HTTP handlers
app/services/      # Business logic
app/models/        # Lucid models
app/validators/    # VineJS schemas
app/jobs/          # Background jobs
```

## Rules

- Thin controllers, fat services
- Always validate input with VineJS
- SIWE for auth, nonces in Redis (5 min TTL)
- Jobs must be idempotent

## Response Format

```typescript
{ data: T }                              // Success
{ error: string }                        // Error
{ data: T[], meta: { total, page } }     // Paginated
```
