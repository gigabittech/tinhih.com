# syntax=docker/dockerfile:1

# ---------- Build stage ----------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Native build tools in case any dep needs node-gyp
RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

# Install ALL deps (dev included) so vite + esbuild can run.
# `--include=optional` is critical: it pulls the platform-specific
# native binaries that rollup/esbuild need (e.g. @rollup/rollup-linux-x64-gnu,
# @esbuild/linux-x64). Without this the build fails with
# "Cannot find module @rollup/rollup-linux-x64-msvc" inside the container.
COPY package.json package-lock.json ./
RUN npm ci --include=optional --no-audit --no-fund

# Copy source
COPY . .

# Build client (vite -> dist/public) and server (esbuild -> dist/index.js)
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Production deps only. `--include=optional` again keeps the
# platform-native rollup/esbuild binaries (rollup is also imported at runtime
# by some modules, and sharp/bufferutil benefit from it too).
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --include=optional --no-audit --no-fund \
 && npm cache clean --force

# Copy built artifacts from the builder
COPY --from=builder /app/dist ./dist

# Run as non-root
RUN groupadd --system --gid 1001 nodejs \
 && useradd  --system --uid 1001 --gid nodejs tinhih
USER tinhih

# HTTP on PORT (3000) and WebSocket on 8080 (see server/websocket-server.ts)
EXPOSE 3000 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||3000) +'/health', r => process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/index.js"]
