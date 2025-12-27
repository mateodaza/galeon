---
paths: packages/contracts/**/*.{sol,ts}
---

# Contracts (Solidity 0.8.20 + Hardhat)

- OpenZeppelin for standard patterns
- NatSpec comments on all public functions
- Use `immutable` for constructor-set values

## Structure

```
contracts/           # Solidity files
contracts/interfaces # Interface definitions
scripts/deploy.ts    # Deployment
test/*.test.ts       # Tests
config/chains.ts     # Chain addresses
```

## Security

- ReentrancyGuard for value transfers
- SafeERC20 for token ops
- Validate all inputs
- Prefer custom errors over require strings

## Rules

- Unit tests for all public functions
- Verify on block explorer after deploy
- Update config/chains.ts with addresses
