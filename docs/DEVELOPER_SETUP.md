# ApprovalSync — Developer Setup & Local Execution Guide

> **Milestone:** FND-02 (Foundation Baseline)<br>
> **Author:** M1 — Platform & Integration Lead<br>
> **Target Audience:** All Team Members (M1, M2, M3, M4)

---

## 1. Prerequisites & Runtime Requirements

- **Node.js:** `v20.x LTS` (Recommended; host environments running `v22.x` are supported via `ES2022` target alignment).
- **Package Manager:** `npm` (v10+).
- **Git:** 2.40+.
- **Operating System:** Windows, macOS, or Linux.

Verify your local environment:
```bash
node -v   # Should output v20.x.x or v22.x.x
npm -v    # Should output v10.x.x
```

---

## 2. Workspace Setup & Environment Configuration

### Step 1: Clone and Navigate
```bash
git clone https://github.com/Arnz18/ApprovalSync.git
cd ApprovalSync
```

### Step 2: Configure Environment Variables
Copy the root `.env.example` to `.env` (or configure your shell environment):
```bash
cp .env.example .env
```

The default values in `.env.example` are pre-configured for local development:
```dotenv
NODE_ENV=development
PORT=3000
API_PREFIX=api/v1
LOG_LEVEL=info
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
```

---

## 3. Backend Installation & Startup

### Step 1: Install Dependencies
Navigate to the `backend/` directory and install dependencies:
```bash
cd backend
npm install
```

### Step 2: Compile and Build
Verify TypeScript compilation:
```bash
npm run build
```

### Step 3: Start Development Server
Start the NestJS development server with file watching enabled:
```bash
npm run start:dev
```

Expected startup log:
```
[Nest] LOG [Bootstrap] ApprovalSync Backend initialized on port 3000 with prefix /api/v1
[Nest] LOG [Bootstrap] Health check ready at: http://localhost:3000/api/v1/health
```

---

## 4. Health Verification & Smoke Testing

### Verify Health Endpoint via HTTP
Open a browser or run `curl`:
```bash
curl http://localhost:3000/api/v1/health
```

Expected JSON Response (`200 OK`):
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "uptimeSeconds": 4,
    "timestamp": "2026-10-22T20:00:00.000Z",
    "environment": "development",
    "version": "0.1.0"
  },
  "meta": {
    "timestamp": "2026-10-22T20:00:00.005Z",
    "correlationId": "4a7b8c9d-1e2f-4a5b-8c9d-0e1f2a3b4c5d"
  }
}
```

### Verify Error Formatting (404 Negative Test)
```bash
curl http://localhost:3000/api/v1/non-existent
```

Expected JSON Response (`404 Not Found`):
```json
{
  "success": false,
  "error": {
    "code": "ERR_RESOURCE_NOT_FOUND",
    "message": "Cannot GET /api/v1/non-existent",
    "statusCode": 404,
    "timestamp": "2026-10-22T20:00:00.000Z",
    "path": "/api/v1/non-existent",
    "correlationId": "4a7b8c9d-1e2f-4a5b-8c9d-0e1f2a3b4c5d"
  }
}
```

---

## 5. Automated Test Suites

### Unit Tests
Executes unit tests for controllers, filters, and services:
```bash
npm test
```

### End-to-End (E2E) Tests
Spawns the NestJS application context with HTTP server and executes synthetic request tests:
```bash
npm run test:e2e
```

---

## 6. Common Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| `EADDRINUSE: port 3000 already in use` | Another process is bound to port 3000. | Change `PORT=3001` in `.env` or terminate the conflicting process. |
| `Configuration error: PORT must be a valid number` | Corrupted `.env` value. | Ensure `PORT` is an integer between 1 and 65535. |
| `ERR_MODULE_NOT_FOUND` | Missing dependencies. | Run `npm install` inside the `backend/` directory. |
