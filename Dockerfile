# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:22-alpine AS deps

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

# Copy only manifests + lockfile for a cacheable install layer
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json packages/shared/
COPY packages/server/package.json packages/server/
COPY packages/web/package.json packages/web/

RUN pnpm install --frozen-lockfile

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

RUN apk add --no-cache python3 make g++
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/packages/server/node_modules ./packages/server/node_modules
COPY --from=deps /app/packages/web/node_modules ./packages/web/node_modules

# Copy source
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared packages/shared
COPY packages/server packages/server
COPY packages/web packages/web
COPY config.yaml ./config.yaml

# Build web first, then server (which bundles web assets via prepack/build)
RUN pnpm --filter @bridge/web build
RUN pnpm --filter @atlascrew/bridge build

# pnpm deploy creates a self-contained production bundle with no workspace symlinks
# --legacy preserves pnpm v9 behavior (pnpm v10 requires inject-workspace-packages otherwise)
RUN pnpm deploy --filter @atlascrew/bridge --prod --legacy /release

# Copy the default config into the release bundle
RUN cp config.yaml /release/config.yaml

# ── Stage 3: Production runner ────────────────────────────────────────────────
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 bridge

COPY --from=builder /release ./

USER bridge

EXPOSE 4200
ENV PORT=4200
ENV HOST=0.0.0.0

CMD ["node", "dist/bin.js", "start"]
