# ApprovalSync — Developer Setup & Local Execution Guide

> **Milestone:** FND-03 (Docker, Environment, Quality Gates & CI Baseline)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Target Audience:** All Team Members (M1, M2, M3, M4)

---

## 1. Prerequisites & Tool Versions

| Tool | Version Requirement | Verification Command | Notes |
|---|---|---|---|
| **Node.js** | `v22.x LTS` | `node -v` | Active LTS; verified compatible with NestJS 10, TypeScript 5.3, and Jest. |
| **npm** | `v10.x+` | `npm -v` | Package manager for dependency trees. |
| **Docker** | `v24.x+` | `docker --version` | Container runtime engine. |
| **Docker Compose**| `v2.20+` | `docker compose version` | Multi-container orchestration tool. |
| **Git** | `2.40+` | `git --version` | Source control management. |

---

## 2. Environment Configuration

### Step 1: Clone Repository
```bash
git clone https://github.com/Arnz18/ApprovalSync.git
cd ApprovalSync
```

### Step 2: Copy Environment Template
Create your local `.env` from the provided safe template:
```bash
cp .env.example .env
```

> [!IMPORTANT]
> Never commit `.env` or any file containing real secrets to version control. `.gitignore` is configured to ignore all `.env` files except `.env.example`.

### Environment Variables Catalog

| Variable | Default Value | Scope | Description |
|---|---|---|---|
| `NODE_ENV` | `development` | Backend | Runtime mode (`development`, `test`, `production`). |
| `PORT` | `3000` | Backend | HTTP port for NestJS application server. |
| `API_PREFIX` | `api/v1` | Backend | Global REST API route prefix. |
| `LOG_LEVEL` | `info` | Backend | Logging verbosity (`debug`, `info`, `warn`, `error`). |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | Backend | Comma-separated list of allowed browser origins. |
| `DEBUG_LOGGING`| `false` | Backend | Enable verbose debug logs in development. |
| `DB_HOST` | `127.0.0.1` | Compose / Backend | Database hostname (host backend connects to `127.0.0.1`). |
| `DB_PORT` | `5432` | Compose / Backend | PostgreSQL host port binding (validated 1–65535). |
| `DB_NAME` | `approvalsync` | Compose / Backend | PostgreSQL database name. |
| `DB_USER` | `postgres` | Compose / Backend | PostgreSQL database superuser. |
| `DB_PASSWORD` | `postgres_dev_password` | Compose / Backend | Development password fallback only. Strictly rejected by `validateConfig` in production (`NODE_ENV=production`). |


---

## 3. Local Development Infrastructure (Docker Compose)

ApprovalSync provides a root-level `compose.yaml` to run local development backing services.

### Start Backing Services (PostgreSQL 16)
Start the PostgreSQL 16 container in detached mode:
```bash
docker compose up -d
```

### Inspect Container Health & Status
Check that the PostgreSQL service has reached a `healthy` state:
```bash
docker compose ps
```

Expected output:
```text
NAME                    IMAGE                SERVICE    STATUS                   PORTS
approvalsync-postgres   postgres:16-alpine   postgres   Up 10 seconds (healthy)  127.0.0.1:5432->5432/tcp
```

### Inspect Container Logs
```bash
docker compose logs -f postgres
```

### Direct Health Readiness Check
Run PostgreSQL's native readiness check utility inside the container:
```bash
docker compose exec postgres pg_isready -U postgres -d approvalsync
```

Expected output:
```text
/var/run/postgresql:5432 - accepting connections
```

### Stop Backing Services
Stop containers without deleting persistent data:
```bash
docker compose down
```

### Resetting Local Database Storage (Data Deletion Warning)
Persistent database data is retained in a named volume (`approvalsync_postgres_data`). Normal `docker compose down` retains this data across restarts.

> [!WARNING]
> Running `docker compose down -v` permanently removes the named volume and **deletes all local development database records**. Use this command only when intentionally performing a clean database reset.
```bash
docker compose down -v
```

---

## 4. Backend Application Setup & Execution

ApprovalSync uses a fast, host-based development workflow for the backend modular monolith.

### Step 1: Install Dependencies
Navigate to the `backend/` directory and install dependencies reproducibly:
```bash
cd backend
npm ci
```

### Step 2: Quality Gates (Format, Lint, Build & Test)
Run quality validation checks:
```bash
# Check code formatting with Prettier
npm run format:check

# Automatically format TypeScript files
npm run format

# Run ESLint validation
npm run lint

# Compile TypeScript to dist/
npm run build

# Run unit tests in non-watch mode
npm test -- --runInBand

# Run end-to-end tests in non-watch mode
npm run test:e2e -- --runInBand
```

### Step 3: Start Backend Development Server
```bash
npm run start:dev
```

Expected startup banner in terminal:
```text
[Nest] LOG [Bootstrap] ApprovalSync Backend initialized on port 3000 with prefix /api/v1
[Nest] LOG [Bootstrap] Health check ready at: http://localhost:3000/api/v1/health
```

---

## 5. Health Verification & Smoke Testing

### Verify Health Endpoint (`GET /api/v1/health`)
Execute HTTP request via `curl` or browser:
```bash
curl http://localhost:3000/api/v1/health
```

Expected JSON Response (`200 OK` with standard `ApiResponse<T>` envelope):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 12,
    "timestamp": "2026-10-22T21:40:00.000Z",
    "environment": "development",
    "version": "0.1.0"
  },
  "meta": {
    "timestamp": "2026-10-22T21:40:00.005Z",
    "correlationId": "b6f5d8a9-4e2c-4b1a-9f8d-0e3a5c7e9b1d"
  }
}
```

### Verify Error Envelope Formatting (404 Negative Test)
```bash
curl http://localhost:3000/api/v1/non-existent
```

Expected JSON Response (`404 Not Found` with standard `ApiErrorResponse` envelope):
```json
{
  "success": false,
  "error": {
    "code": "ERR_RESOURCE_NOT_FOUND",
    "message": "Cannot GET /api/v1/non-existent",
    "statusCode": 404,
    "timestamp": "2026-10-22T21:40:00.000Z",
    "path": "/api/v1/non-existent",
    "correlationId": "b6f5d8a9-4e2c-4b1a-9f8d-0e3a5c7e9b1d"
  }
}
```

---

## 6. Implementation Status & Component Boundaries

| Component | Current Milestone Status | Implementing Chunk | Notes |
|---|---|---|---|
| **API Conventions & Contracts** | Implemented & Frozen | `FND-02` | Standard `/api/v1` envelopes, UUIDv4 correlation IDs, error codes. |
| **PostgreSQL 16 Service** | Implemented (Docker) | `FND-03` | Healthy container, volume persistence, `127.0.0.1:5432` binding. |
| **Backend Skeleton & Health** | Implemented (Host) | `FND-02`, `FND-03` | NestJS 10 modular monolith, `/api/v1/health` endpoint. |
| **Quality Gates & CI** | Implemented | `FND-03` | ESLint, Prettier, non-watch Jest harness, GitHub Actions. |
| **Database ORM & Migrations** | Reserved / Blocked | `BE-01`, `BE-02` | Entities, migrations, and seed framework will connect to Postgres. |
| **Redis 7 & BullMQ Workers** | Reserved / Blocked | `BE-08`, `DOC-02` | Durable SLA queues and OCR processing pipeline. |
| **Document AI Pipeline** | Reserved / Blocked | `DOC-01`–`DOC-07` | Upload, OCR, tamper detection, and verification adapters. |
| **Frontend UI Client** | Reserved / Blocked | `FE-01`–`FE-07` | React 18 + Vite SPA application wizard and dashboards. |

---

## 7. Troubleshooting Guide

| Issue | Symptom / Error | Cause | Recommended Action |
|---|---|---|---|
| **Port 5432 Conflict** | `Bind for 0.0.0.0:5432 failed: port is already allocated` | Another local PostgreSQL instance is running on port 5432. | Stop local postgres service or configure `DB_PORT=5433` in `.env`. |
| **Port 3000 Conflict** | `EADDRINUSE: address already in use :::3000` | Another process is listening on port 3000. | Set `PORT=3001` in `.env` or terminate the conflicting process. |
| **Docker Daemon Inactive** | `Cannot connect to the Docker daemon` | Docker Desktop or engine is stopped. | Start Docker Desktop or run `sudo systemctl start docker`. |
| **Database Port Validation** | `Configuration error: DB_PORT must be a valid port number (1-65535)` | Invalid port string passed in `.env`. | Ensure `DB_PORT` in `.env` is an integer between 1 and 65535. |
| **Prettier Formatting Fails**| `Code style issues found in X files` | Unformatted TypeScript files detected. | Run `npm run format` inside `backend/` to apply automatic fixes. |
| **Dependencies Missing** | `Cannot find module '@nestjs/core'` | `node_modules` not installed. | Run `npm ci` inside `backend/`. |
