# Dedicated Server Deployment & Operations Guide (`deploy/`)

This directory contains the operational scripts and configuration conventions for the dedicated production site servers (Zambia, Malawi, and Kenya).

---

## 1. Production Server Architecture & Layout

Each site runs on its own independent, standalone server with no shared database or cross-site network dependencies:

* **Repository Location**: `/opt/digital-twin`
* **Static Web Directory**: `/var/www/digital-twin-web`
* **Host Services**:
  * PostgreSQL 16 + TimescaleDB (host-installed, listening on `localhost:5432`)
  * Node.js (v20+) and npm
  * Docker Engine with Docker Compose v2 plugin
  * Git
  * Nginx web server

---

## 2. Nginx Reverse Proxy Configuration

On each site server, configure Nginx (`/etc/nginx/sites-available/digital-twin.conf`) to serve the static frontend export and proxy `/api/*` and `/health` requests to `backend/api` on `127.0.0.1:4000`:

```nginx
server {
    listen 80;
    server_name your-site-domain.org;

    # Static Expo React Native Web Bundle
    root /var/www/digital-twin-web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API Gatekeeper
    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Check
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_set_header Host $host;
    }
}
```

---

## 3. Production Environment File (`.env.production`)

Each server must have `/opt/digital-twin/.env.production` provisioned via GitHub Environments:

```bash
# Target Site Identifier (zambia, malawi, or kenya)
SITE_TARGET=zambia

# Connection string pointing to the host OS database via host gateway
DATABASE_URL=postgres://app_user:app_secure_password@host.docker.internal:5432/credit_dt?sslmode=disable
```

---

## 4. Automated Deployment Workflow (`deploy.sh`)

When code merges into `prod`, the GitHub Actions workflow connects via SSH as `root` and invokes:
```bash
/opt/digital-twin/deploy/deploy.sh
```

Execution steps:
1. Validates `.env.production`.
2. Runs pre-flight database migrations (`dbmate`) against the host database. **If migrations fail, deployment aborts immediately without touching live containers.**
3. Builds the static Expo web export directly on the host OS and copies output into `/var/www/digital-twin-web`.
4. Rebuilds and restarts the site's production containers with `--profile $SITE_TARGET`.
5. Polls `http://127.0.0.1:4000/health` until HTTP 200 is verified.

---

## 5. Manual Rollback Workflow (`rollback.sh`)

If a production defect is discovered post-release, the Lead Developer can manually roll back to any Git commit or release tag:

```bash
ssh root@server-ip
cd /opt/digital-twin
./deploy/rollback.sh <commit-hash-or-tag>

# Example:
./deploy/rollback.sh v1.0.0
```

