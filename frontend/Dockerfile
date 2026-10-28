# ==============================================================================
# ApprovalSync Frontend — Production Multi-Stage Dockerfile
# Milestone: DEP-01 (Container Hardening & Production Configuration)
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build React + Vite SPA
# ------------------------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Accept build arguments for environment configuration
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

ARG VITE_ENABLE_DEMO_PANEL=true
ENV VITE_ENABLE_DEMO_PANEL=${VITE_ENABLE_DEMO_PANEL}

# Copy package definitions and lockfile
COPY package.json package-lock.json ./

# Install dependencies cleanly
RUN npm ci

# Copy configuration and source files
COPY tsconfig*.json vite.config.ts index.html .eslintrc.cjs ./
COPY src/ ./src/

# Compile production distribution bundle to dist/
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production Nginx Static Server & Reverse Proxy
# ------------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runner

# Remove default nginx website configuration and public files
RUN rm -rf /etc/nginx/conf.d/* /usr/share/nginx/html/*

# Copy custom Nginx configuration (reverse proxy + SPA router fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled static assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose internal HTTP port
EXPOSE 80

# Health check using busybox wget against local healthz endpoint
HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
  CMD wget -q --spider http://127.0.0.1/healthz || exit 1

# Start Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
