# ApprovalSync — AWS EC2 Production Deployment Guide
## Multi-Tenant Co-Existence on an Existing EC2 Instance (RakshakGIS Host)

> **Document Version:** 1.0.0 (Production Release)
> **Milestone:** DEP-01 (Container Hardening & EC2 Deployment)
> **Target Environment:** Linux AWS EC2 Instance running Docker Engine & Docker Compose Plugin
> **Co-Existing Application:** RakshakGIS (Strict Isolation Mandatory)

---

## Architecture & Isolation Overview

ApprovalSync runs as an isolated, containerized application stack consisting of:
1. **Frontend (`frontend`)**: Multi-stage React 18 + Vite SPA served via an optimized Nginx web server and reverse proxy.
2. **Backend (`backend`)**: Multi-stage NestJS 10 modular monolith running compiled production JavaScript with TypeORM under a non-root user (`node`).
3. **Database (`postgres`)**: PostgreSQL 16 Alpine container with private networking and persistent named volume.
4. **Document Storage (`approvalsync_storage_data`)**: Dedicated persistent volume preserving all uploaded PDF deeds, NOCs, and affidavits across redeployments.

```
                      Internet / Client Browser
                                 │
                                 ▼
                     [EC2 Host Security Group]
                  (Inbound Allowed on Port 8080)
                                 │
                                 ▼
      ┌────────────────────────────────────────────────────────┐
      │  Frontend Container (Port 80 mapped to Host 8080)       │
      │  ┌──────────────────────────────────────────────────┐  │
      │  │ Nginx Web Server & Reverse Proxy                 │  │
      │  │                                                  │  │
      │  │ • Static SPA: /usr/share/nginx/html (React Vite) │  │
      │  │ • Health Check: /healthz                         │  │
      │  │ • API Proxy: /api/* ───► http://backend:3000     │  │
      │  └──────────────────────────────────────────────────┘  │
      └──────────────────────────┬─────────────────────────────┘
                                 │ Internal Docker Network
                                 │ (approvalsync_internal_network)
                                 ▼
      ┌────────────────────────────────────────────────────────┐
      │  Backend Container (Port 3000 - Internal Only)         │
      │  ┌──────────────────────────────────────────────────┐  │
      │  │ NestJS API Server (node dist/main.js)            │  │
      │  │ • Global Prefix: /api/v1                         │  │
      │  │ • Document Storage: /app/storage/documents       │  │
      │  │   (Mounted to approvalsync_storage_data)         │  │
      │  └───────────────────────┬──────────────────────────┘  │
      └──────────────────────────┼─────────────────────────────┘
                                 │ Internal Docker Network
                                 ▼
      ┌────────────────────────────────────────────────────────┐
      │  Database Container (Port 5432 - Internal Only)        │
      │  ┌──────────────────────────────────────────────────┐  │
      │  │ PostgreSQL 16 Alpine Engine                      │  │
      │  │ • Data Dir: /var/lib/postgresql/data             │  │
      │  │   (Mounted to approvalsync_postgres_data)        │  │
      │  └──────────────────────────────────────────────────┘  │
      └────────────────────────────────────────────────────────┘
```

### RakshakGIS Isolation Rules
To guarantee zero disruption to RakshakGIS:
* **Unique Compose Project Name:** Everything is scoped under `approvalsync` (`name: approvalsync`). Container names, network names, and volume names cannot collide.
* **Non-Default Host Port:** By default, ApprovalSync binds to host port `8080` (`${APPROVALSYNC_PORT:-8080}:80`). Ports `80`, `443`, `3000`, and `5432` are left untouched.
* **Internal Database:** PostgreSQL port `5432` is **not** exposed to the host network.
* **Internal Backend:** NestJS port `3000` is **not** exposed to the host network.
* **No Blanket Commands:** Never run `docker compose down` without the `-f compose.production.yaml` flag, and never use `docker system prune -a` or `docker volume prune`.

---

## 1. Pre-Deployment Checks on EC2

SSH into your EC2 instance and inspect existing system resources and active services.

```bash
# Connect to your EC2 instance from your terminal
ssh -i /path/to/your-key.pem ubuntu@<EC2-PUBLIC-IP>
```

### 1.1 Inspect Active Containers & Ports
Verify what ports RakshakGIS and other host processes are already using:

```bash
# List all running containers across all projects
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

# Check open listening TCP ports on the EC2 host
sudo ss -tulpn | grep LISTEN
```

> [!IMPORTANT]
> If RakshakGIS is currently using port `8080`, select another unused port (such as `8081`, `8082`, `8888`, or `9000`) and set `APPROVALSYNC_PORT=<chosen-port>` in `.env.production`.

### 1.2 Inspect Available Memory and Disk Space
ApprovalSync requires approximately **1 GB of free RAM** during build/runtime and **5 GB of free disk space**:

```bash
# Check available memory
free -h

# Check available disk space on root volume
df -h /
```

> [!TIP]
> If available RAM is less than 1.5 GB on a smaller instance (e.g., `t2.small` or `t3.small`), configure a 2 GB swap file to prevent out-of-memory (OOM) compiler crashes during frontend/backend image builds:
> ```bash
> # Optional: Create a 2GB swapfile if none exists
> if [ $(swapon --show | wc -l) -eq 0 ]; then
>   sudo fallocate -l 2G /swapfile
>   sudo chmod 600 /swapfile
>   sudo mkswap /swapfile
>   sudo swapon /swapfile
>   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
>   echo "Swap enabled successfully."
> fi
> ```

### 1.3 Verify Docker Engine & Docker Compose Plugin
Ensure Docker Engine 24+ and Docker Compose v2 are installed:

```bash
docker --version
docker compose version
```

If Docker is missing or outdated:
```bash
# Official Docker installation for Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

---

## 2. Deploying ApprovalSync to EC2

### 2.1 Transfer or Clone the Repository
Clone the ApprovalSync repository into an isolated directory on the EC2 host:

```bash
cd ~
git clone https://github.com/Arnz18/ApprovalSync.git
cd ApprovalSync
```

*(Alternatively, if transferring from Windows via SCP:)*
```powershell
# (Run on your local Windows PowerShell)
scp -i /path/to/your-key.pem -r c:\Users\swapn\projects\ApprovalSync ubuntu@<EC2-PUBLIC-IP>:~/ApprovalSync
```

### 2.2 Create the Production Environment File (`.env.production`)
Create the production environment file from the provided template:

```bash
cd ~/ApprovalSync
cp .env.production.example .env.production
chmod 600 .env.production
```

Edit `.env.production` using `nano` or `vim`:
```bash
nano .env.production
```

Generate secure production secrets using Linux CLI tools:
```bash
# Generate a strong 32-character random string for JWT_SECRET
openssl rand -base64 32

# Generate a strong 24-character random string for DB_PASSWORD
openssl rand -base64 24
```

Set the values in `.env.production`:
```ini
APPROVALSYNC_PORT=8080
DB_NAME=approvalsync
DB_USER=approvalsync_user
DB_PASSWORD=<paste-your-generated-db-password>
JWT_SECRET=<paste-your-generated-jwt-secret-min-32-chars>
JWT_EXPIRES_IN=3600s
CORS_ORIGINS=*
LOG_LEVEL=warn
DEBUG_LOGGING=false
ENABLE_SWAGGER=false
```

Save and exit (`Ctrl + O`, `Enter`, `Ctrl + X` in nano).

> [!CAUTION]
> Never set `DB_PASSWORD=postgres_dev_password` or leave `JWT_SECRET` with the development placeholder. ApprovalSync's internal configuration validator strictly aborts startup if development credentials are used in `NODE_ENV=production`.

### 2.3 Build Production Docker Images
Build the production images locally on the EC2 instance using the production Compose specification:

```bash
cd ~/ApprovalSync
docker compose --env-file .env.production -f compose.production.yaml build
```

This compiles:
1. `approvalsync-backend`: Multi-stage NestJS build with pruned production `node_modules`.
2. `approvalsync-frontend`: Multi-stage React + Vite compilation embedded in Nginx Alpine.

### 2.4 Start the Database & Verify Health
Start the PostgreSQL container first to allow it to initialize its cluster and named volume:

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d postgres
```

Wait 10–15 seconds and check health status:
```bash
docker compose --env-file .env.production -f compose.production.yaml ps postgres
```
Expected output:
```text
NAME                     IMAGE                STATUS                    PORTS
approvalsync-postgres-1  postgres:16-alpine   Up 15 seconds (healthy)
```

### 2.5 Run Database Migrations
Execute all six TypeORM migrations explicitly using the production migration runner:

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm backend node dist/database/run-migrations.js
```

Expected output:
```text
[MigrationRunner] Initializing database connection...
[MigrationRunner] Database connected. Executing pending migrations...
[MigrationRunner] Successfully executed 6 migration(s):
  - InitialCoreSchema1729640000000
  - CreateRulesAndChecklists1729720000000
  - CreateWorkflowTimelineEvents1729800000000
  - CreateAuditCheckpoints1729880000000
  - EnhanceSlaTimersAndEscalations1729960000000
  - CreateUndertakingsAndLeases1730040000000
[MigrationRunner] Database connection closed.
```

### 2.6 (Optional) Seed Synthetic Demo Accounts & APH Norms
If you are deploying for technical evaluation, regulatory demonstration, or hackathon judging, populate the idempotent synthetic demo dataset:

```bash
docker compose --env-file .env.production -f compose.production.yaml run --rm backend node dist/database/seeds/run-seed.js
```

Expected output:
```text
[SeedRunner] Database connected. Seeding synthetic data...
[SeedRunner] Seed execution completed successfully:
  - Institutions created:        2
  - Users created:               5
  - Applications created:        2
  - Documents created:           1
  - Audit logs created:          2
  - SLA timers created:          1
  - Rule sets created:           1
  - Rule versions created:       1
  - Regulatory rules created:    4
  - Checklist templates created: 1
  - Checklist items created:     4
  - Timeline events created:     1
  - Undertakings created:        4
  - Existing skipped:            0
```

> [!NOTE]
> The seed runner is fully idempotent. If rerun in the future, it safely detects existing records and skips them without generating duplicates or errors.

### 2.7 Launch the Full ApprovalSync Stack
Start the remaining services (`backend` and `frontend`):

```bash
docker compose --env-file .env.production -f compose.production.yaml up -d
```

Verify that all three containers are healthy:
```bash
docker compose --env-file .env.production -f compose.production.yaml ps
```

Expected output:
```text
NAME                     IMAGE                     STATUS                   PORTS
approvalsync-backend-1   approvalsync-backend      Up 30 seconds (healthy)  3000/tcp
approvalsync-frontend-1  approvalsync-frontend     Up 20 seconds (healthy)  0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
approvalsync-postgres-1  postgres:16-alpine        Up 2 minutes (healthy)
```

Confirm logs show normal startup without errors:
```bash
# View recent backend logs
docker compose --env-file .env.production -f compose.production.yaml logs --tail=50 backend

# View recent frontend reverse-proxy logs
docker compose --env-file .env.production -f compose.production.yaml logs --tail=20 frontend
```

---

## 3. Network & Security Group Configuration

To allow external access to ApprovalSync:
1. Open the **AWS EC2 Management Console**.
2. Navigate to **Instances** and select your EC2 instance.
3. Under the **Security** tab, click on the active **Security Group**.
4. Click **Edit inbound rules**.
5. Add the following rule:
   * **Type:** Custom TCP
   * **Port range:** `8080` (or your configured `APPROVALSYNC_PORT`)
   * **Source:** `Anywhere-IPv4` (`0.0.0.0/0`) or restrict to your organization's IP address.
   * **Description:** `ApprovalSync Web Application & Reverse Proxy`
6. Click **Save rules**.

---

## 4. Verification & Testing Checklist

### 4.1 Automated CLI Health Probe
Run from the EC2 terminal or your local workstation:

```bash
# Check frontend Nginx health
curl -f http://localhost:8080/healthz

# Check backend health through the reverse proxy
curl http://localhost:8080/api/v1/health

# Check backend dependency readiness (PostgreSQL active)
curl http://localhost:8080/api/v1/health/readiness
```

All three must return HTTP `200 OK`.

### 4.2 Browser Verification Checklist
Open your web browser and navigate to:
**`http://<EC2-PUBLIC-IP>:8080`**

#### Seeded Demo Accounts (Password: `DemoPass@123`)
| Role | Email | Purpose / Land Page |
|:---|:---|:---|
| **System Administrator** | `demo.admin@synthetic.approvalsync.local` | Full platform administration & system health |
| **Institution Representative (Apex Inst.)** | `demo.institution@synthetic.approvalsync.local` | Multi-step intake wizard, document uploads, application tracking |
| **Institution Representative (National Poly.)** | `college.b@synthetic.approvalsync.local` | Multi-tenant isolation testing (College B) |
| **Scrutiny Officer** | `demo.scrutiny@synthetic.approvalsync.local` | Application scrutiny queue (`/scrutiny`), dossier findings & review |
| **Regional Officer** | `demo.regional@synthetic.approvalsync.local` | Regional approvals, defect tracking & escalation review |

1. **Unauthenticated Redirect:** Confirm navigation to `/login`.
2. **API Status Badge:** Verify that the header pill displays **`API Online`** (green).
3. **Sign In as Institution User:**
   * **Email:** `demo.institution@synthetic.approvalsync.local`
   * **Password:** `DemoPass@123`
   * Confirm redirection to `/applications` and review the multi-step intake wizard.
4. **Document Upload Test:**
   * On Step 3 of the wizard, upload a test PDF (up to 15 MB).
   * Confirm that Nginx accepts the payload and the backend stores the file in the persistent volume.
5. **Undertakings & Leases:**
   * Navigate to `/undertakings`.
   * Confirm the seeded 99-year lease deed and safety certificates appear with calculated expiry countdowns.
6. **Sign In as Scrutiny Officer:**
   * Sign out and log in with `demo.scrutiny@synthetic.approvalsync.local` / `DemoPass@123`.
   * Lands on `/scrutiny`. Open application `APP-2026-DEMO-002` and inspect the multi-pipeline dossier findings and cryptographic audit timeline.
7. **SPA Page Refresh Test:**
   * Press `Ctrl + F5` on `/scrutiny` or `/undertakings`.
   * Confirm the page reloads cleanly without HTTP `404 Not Found` (verifying Nginx `try_files` configuration).

---

## 5. Domain & HTTPS / SSL Configuration (Optional)

If you have a domain name pointing to your EC2 instance (e.g. `approvalsync.yourdomain.com`), you can terminate TLS using host-level Nginx with Let's Encrypt Certbot without interfering with RakshakGIS.

### 5.1 Host-Level Nginx Reverse Proxy
Install Nginx and Certbot on the EC2 host:
```bash
sudo apt-get install -y nginx certbot python3-certbot-nginx
```

Create `/etc/nginx/sites-available/approvalsync.conf`:
```nginx
server {
    server_name approvalsync.yourdomain.com;

    client_max_body_size 25M;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable the site and obtain an SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/approvalsync.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

# Obtain free Let's Encrypt TLS certificate
sudo certbot --nginx -d approvalsync.yourdomain.com
```

---

## 6. Maintenance, Backups & Updates

### 6.1 Database Backup & Restore
To back up the PostgreSQL database safely while the container is running:

```bash
# Create a timestamped SQL dump
cd ~/ApprovalSync
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres pg_dump -U approvalsync_user approvalsync > ~/backup_approvalsync_$(date +%Y%m%d_%H%M%S).sql
```

To restore from a backup:
```bash
docker compose --env-file .env.production -f compose.production.yaml exec -T postgres psql -U approvalsync_user -d approvalsync < ~/path_to_backup.sql
```

### 6.2 Backing Up Uploaded Documents
To back up the uploaded statutory documents:
```bash
# Archive the persistent storage volume
sudo tar -czvf ~/backup_approvalsync_docs_$(date +%Y%m%d_%H%M%S).tar.gz /var/lib/docker/volumes/approvalsync_storage_data/_data
```

### 6.3 Updating ApprovalSync in the Future
To pull latest changes, rebuild, run new migrations, and restart ApprovalSync with zero RakshakGIS impact:

```bash
cd ~/ApprovalSync

# 1. Pull latest code
git pull origin main

# 2. Rebuild images
docker compose --env-file .env.production -f compose.production.yaml build

# 3. Apply any new migrations
docker compose --env-file .env.production -f compose.production.yaml run --rm backend node dist/database/run-migrations.js

# 4. Restart services with zero-downtime rolling update
docker compose --env-file .env.production -f compose.production.yaml up -d
```

### 6.4 Safe Shutdown (Preserving Data & RakshakGIS)
To stop ApprovalSync:

```bash
cd ~/ApprovalSync
docker compose --env-file .env.production -f compose.production.yaml down
```

> [!WARNING]
> **NEVER** run `docker compose down -v` or `docker system prune` in production. Adding `-v` deletes the named volumes (`approvalsync_postgres_data` and `approvalsync_storage_data`), destroying all institutional data and uploaded documents!

---

## 7. Troubleshooting Guide

| Issue | Root Cause | Solution |
|:---|:---|:---|
| `port is already allocated: 0.0.0.0:8080` | Port 8080 is used by RakshakGIS or another process. | Change `APPROVALSYNC_PORT=8081` in `.env.production` and run `docker compose ... up -d`. |
| `Production environment cannot rely on default DB_PASSWORD` | `DB_PASSWORD` in `.env.production` is set to `postgres_dev_password` or empty. | Set a strong, unique password in `.env.production` (min 16 chars). |
| `Production environment requires strong JWT_SECRET` | `JWT_SECRET` in `.env.production` is under 32 characters or uses the demo default. | Run `openssl rand -base64 32` and update `JWT_SECRET` in `.env.production`. |
| `413 Request Entity Too Large` | Document upload exceeds Nginx buffer limit. | `frontend/nginx.conf` has `client_max_body_size 25M;` configured. Rebuild frontend image if modified. |
| `ERR_CONNECTION_TIMED_OUT` when browsing port 8080 | AWS Security Group blocks inbound port 8080. | In AWS Console, add Custom TCP Rule for port 8080 in the instance Security Group. |
| `relation "..." does not exist` | Database migrations have not been executed on initial setup. | Run `docker compose --env-file .env.production -f compose.production.yaml run --rm backend node dist/database/run-migrations.js`. |
| `502 Bad Gateway` on `/api/*` routes | Backend container is starting up, unhealthy, or crashed. | Check backend logs: `docker compose ... logs backend`. Ensure PostgreSQL is healthy. |
