FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate

# Prune the monorepo for just the api package
FROM base AS pruner
WORKDIR /app
RUN pnpm add -g turbo
COPY . .
RUN turbo prune @galeon/api --docker

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

# Build the api and its dependencies
RUN pnpm turbo build --filter=@galeon/api

# Production runner
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3333

# Copy the entire pruned workspace with built packages
COPY --from=builder /app .

# Remove dev dependencies
RUN pnpm prune --prod

EXPOSE 3333

WORKDIR /app/apps/api/build
CMD ["node", "bin/server.js"]
