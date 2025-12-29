# Galeon

Private payments using EIP-5564 stealth addresses. Mantle Hackathon 2025.

## Critical Files

- `galeon-hackathon-plan.md` - **DO NOT MODIFY** unless explicitly requested
- `PROGRESS.md` - Global progress tracker (update on major milestones)
- `apps/*/PROGRESS.md` - App-specific progress
- `packages/*/PROGRESS.md` - Package-specific progress

## Commands

```bash
pnpm dev              # Start all in dev mode
pnpm build            # Build all
pnpm typecheck        # TypeScript check
pnpm test             # Run tests
pnpm --filter web dev # Frontend only
pnpm --filter api dev # Backend only
```

## Code Standards

- **Files**: <300 LOC target, 1000 max
- **Functions**: <50 LOC
- **No `any`**: Use strict TypeScript
- **DRY**: Shared crypto logic in `packages/stealth`

## Naming

| Type      | Style           | Example              |
| --------- | --------------- | -------------------- |
| Files     | kebab-case      | `stealth-service.ts` |
| Types     | PascalCase      | `StealthKeys`        |
| Functions | camelCase       | `derivePortKeys`     |
| Constants | SCREAMING_SNAKE | `SCHEME_ID`          |
| DB tables | snake_case      | `ports`              |

## Security

- NEVER commit secrets
- NEVER store spending keys (derive on-demand)
- Validate all user input at API boundaries

## Stack

Frontend: Next.js 16, React 19, Tailwind v4, wagmi v3
Backend: AdonisJS 6, Lucid ORM, Transmit SSE
Contracts: Solidity 0.8.24, Hardhat 2.28
Crypto: @noble/curves 2.0, @noble/hashes 2.0
