FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# Prune the monorepo for just the indexer package
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @galeon/indexer --docker

# Install dependencies and build
FROM base AS builder
WORKDIR /app

# Copy pruned lockfile and package.jsons
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/pnpm-lock.yaml ./pnpm-lock.yaml

# Install all dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY --from=pruner /app/out/full/ .

# Generate Ponder types
RUN pnpm --filter=@galeon/indexer codegen

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy the entire pruned workspace
COPY --from=builder /app .

# Remove dev dependencies
RUN pnpm prune --prod

EXPOSE 42069

WORKDIR /app/apps/indexer
CMD ["pnpm", "start"]
