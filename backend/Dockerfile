# ==============================================================================
# ApprovalSync Backend — Production Multi-Stage Dockerfile
# Milestone: DEP-01 (Container Hardening & Production Configuration)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Dependencies and Build
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install native build tools for dependencies with C++ extensions (e.g. bcrypt)
RUN apk add --no-cache python3 make g++

# Copy package definitions and lockfile
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies required for NestJS compilation)
RUN npm ci

# Copy TypeScript configuration and source files
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/

# Compile TypeScript to dist/
RUN npm run build

# Prune development dependencies to keep only production packages
RUN npm prune --omit=dev && npm cache clean --force

# ------------------------------------------------------------------------------
# Stage 2: Production Minimal Runtime
# ------------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /app

# Install runtime utilities:
# - curl: required for container healthcheck probe
# - dumb-init: lightweight init system for proper PID 1 signal forwarding and graceful shutdown
RUN apk add --no-cache curl dumb-init

# Set production environment flags
ENV NODE_ENV=production
ENV PORT=3000

# Create application storage and dist directories with ownership assigned to non-root user 'node'
RUN mkdir -p /app/storage/documents /app/dist && \
    chown -R node:node /app

# Copy production dependencies and package manifest from builder stage
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json

# Copy compiled application code and database migrations from builder stage
COPY --from=builder --chown=node:node /app/dist ./dist

# Switch to non-root user (UID 1000) for security hardening
USER node

# Expose backend application port (internal to Docker network)
EXPOSE 3000

# Container liveness health check probe
HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health/liveness || exit 1

# Handle shutdown signals (SIGTERM, SIGINT) gracefully with dumb-init
ENTRYPOINT ["/usr/bin/dumb-init", "--"]

# Production entrypoint
CMD ["node", "dist/main.js"]
