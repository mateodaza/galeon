---
paths: apps/web/**/*.{ts,tsx}
---

# Frontend (Next.js 15 + React 19)

- App Router only (not Pages Router)
- Server Components by default, `'use client'` when needed
- Tailwind v4 + shadcn/ui for styling
- wagmi v2 + viem for wallet ops
- TanStack Query for server state

## Structure

```
app/           # Routes + layouts
components/ui/ # shadcn components
components/    # Feature components
hooks/         # Custom hooks
lib/           # Utilities
```

## Rules

- One component per file
- Handle wallet errors gracefully
- Show loading states during transactions
