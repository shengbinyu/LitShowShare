# syntax=docker/dockerfile:1.6
# ============================================================
# LitShowShare - Production Image (Frontend + Backend in one)
# Multi-stage build, optimized for China network environment.
# ============================================================

ARG NODE_IMAGE=node:20-bookworm-slim
ARG NPM_REGISTRY=https://registry.npmmirror.com

# ============================================================
# Stage 1: frontend-builder
# Build the React + Vite frontend, output -> /app/dist
# ============================================================
FROM ${NODE_IMAGE} AS frontend-builder
ARG NPM_REGISTRY

WORKDIR /app

# Use China npm mirror for faster install
RUN npm config set registry ${NPM_REGISTRY}

# Install frontend dependencies (cache friendly)
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Copy source and build
COPY tsconfig.json vite.config.ts index.html postcss.config.js tailwind.config.js eslint.config.js ./
COPY public ./public
COPY src ./src
RUN npm run build

# ============================================================
# Stage 2: backend-deps
# Install backend dependencies (native better-sqlite3 build)
# ============================================================
FROM ${NODE_IMAGE} AS backend-deps
ARG NPM_REGISTRY

# Switch apt source to Tsinghua mirror for faster apt install
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends \
       python3 make g++ ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend
RUN npm config set registry ${NPM_REGISTRY}

COPY backend/package.json backend/package-lock.json ./
# Install full deps (tsx is required at runtime to execute .ts directly)
RUN npm ci --no-audit --no-fund

# ============================================================
# Stage 3: runtime
# Slim production image
# ============================================================
FROM ${NODE_IMAGE} AS runtime

ENV NODE_ENV=production \
    PORT=3001 \
    HOST=0.0.0.0 \
    TZ=Asia/Shanghai

WORKDIR /app

# Install tini for proper PID 1 signal handling
RUN sed -i 's|deb.debian.org|mirrors.tuna.tsinghua.edu.cn|g' /etc/apt/sources.list.d/debian.sources \
  && apt-get update \
  && apt-get install -y --no-install-recommends tini ca-certificates tzdata \
  && rm -rf /var/lib/apt/lists/*

# Copy frontend build output (served by backend in production)
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source + installed node_modules
COPY backend/package.json ./backend/package.json
COPY backend/tsconfig.json ./backend/tsconfig.json
COPY backend/src ./backend/src
COPY --from=backend-deps /app/backend/node_modules ./backend/node_modules

# Create persistent dirs and grant ownership to the non-root "node" user
RUN mkdir -p /app/backend/data /app/backend/uploads \
  && chown -R node:node /app

USER node

EXPOSE 3001

# Persistent volumes (override via docker-compose for host bind-mount)
VOLUME ["/app/backend/data", "/app/backend/uploads"]

# Healthcheck: API root should respond
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+ (process.env.PORT||3001) +'/api/auth', r => process.exit(r.statusCode < 500 ? 0 : 1)).on('error', () => process.exit(1))"

# Use tini as PID 1, run backend via tsx (matches `npm start`)
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "backend/node_modules/.bin/tsx", "backend/src/index.ts"]
