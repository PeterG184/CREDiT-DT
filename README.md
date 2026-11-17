# Digital Twin Cloud Platform (CREDiT-DT)

[![Database CI](https://github.com/credit-dt/credit-dt/actions/workflows/ci-database.yml/badge.svg)](https://github.com/credit-dt/credit-dt/actions/workflows/ci-database.yml)
[![Backend CI](https://github.com/credit-dt/credit-dt/actions/workflows/ci-backend.yml/badge.svg)](https://github.com/credit-dt/credit-dt/actions/workflows/ci-backend.yml)
[![Frontend CI](https://github.com/credit-dt/credit-dt/actions/workflows/ci-frontend.yml/badge.svg)](https://github.com/credit-dt/credit-dt/actions/workflows/ci-frontend.yml)

The **CREDiT Digital Twin (DT)** is an industrial-grade cloud and edge platform modeling solar microgrids and high-power communal/industrial loads (hammer mills, irrigation and borehole water pumps, student dormitories, and commercial bakeries). 

The platform is designed for a phased multi-site rollout across independent dedicated servers in **Zambia** (Phase 1, active development), **Malawi** (Phase 2), and **Kenya** (Phase 3).

---

## Table of Contents

1. [Architectural Overview](#1-architectural-overview)
2. [Multi-Site Build Targets (`SITE_TARGET`)](#2-multi-site-build-targets-site_target)
3. [Strict Database Gatekeeper & Schema Separation](#3-strict-database-gatekeeper--schema-separation)
4. [Dual-Target Frontend (Desktop Web & Standalone Mobile)](#4-dual-target-frontend-desktop-web--standalone-mobile)
5. [Quickstart (Single Command Dev Launcher)](#5-quickstart-single-command-dev-launcher)
6. [Child Documentation Links](#6-child-documentation-links)
7. [Testing & CI/CD Pipeline](#7-testing--cicd-pipeline)
8. [Lead Developer Handover Guide](#8-lead-developer-handover-guide)

---

## 1. Architectural Overview

```
+-----------------------------------------------------------------------------------------+
|                                Dedicated Site Server                                    |
|                                                                                         |
|   +------------------------------------+                                                |
|   |          Nginx Web Server          |                                                |
|   |   Static Web: /var/www/...         |                                                |
|   +---------+--------------------+-----+                                                |
|             |                    |                                                      |
|   Static Web| (port 80/443)      | Reverse Proxy /api/* & /health                       |
|             v                    v (127.0.0.1:4000)                                     |
|   +-------------------+  +----------------------------------------------------------+   |
|   | Desktop Browser   |  |                  Docker Bridge Network                   |   |
|   | Client            |  |                                                          |   |
|   +-------------------+  |   +--------------------------------------------------+   |   |
|                          |   |             backend/api (FastAPI)                |   |   |
|   +-------------------+  |   |          * SOLE DATABASE GATEKEEPER *            |   |   |
|   | Standalone Mobile |  |   +----------+--------------------+--------------+---+   |   |
|   | App (iOS/Android) |  |              |                    |              ^       |   |
|   +---------+---------+  |         HTTP |                    | SQL          | HTTP  |   |
|             |            |              v                    v              |       |   |
|             +------------+-> +--------------------+   +-----------------+  +---+--+ |   |
|                          |   | Secondary Compute  |   | Host PostgreSQL |  |Bento | |   |
|                          |   | Worker Containers  |   | + TimescaleDB   |  |ML    | |   |
|                          |   +--------------------+   +-----------------+  +------+ |   |
|                          +----------------------------------------------------------+   |
+-----------------------------------------------------------------------------------------+
```

### Key Tenets
1. **Zero Cross-Site Leakage**: Each country runs on its own isolated server. There is no database replication or inter-site communication.
2. **Sole Database Gatekeeper**: Only `backend/api` has database credentials. Frontend, workers, and ML models communicate with the backend exclusively via HTTP.
3. **Database Schema Separation**:
   * `raw` (Read-Only): Written by the external sensor telemetry ingestion pipeline. `backend/api` has `SELECT`-only privileges.
   * `app` (Read/Write): Owned and migrated by this repository via `dbmate`. Stores digital twin state, metadata, and TimescaleDB hypertable forecast outputs with columnar compression.
4. **Additive Forecasting Models**: BentoML container microservices attached via Docker Compose profiles.

---

## 2. Multi-Site Build Targets (`SITE_TARGET`)

All three site targets (`zambia`, `malawi`, `kenya`) live in this single repository and build simultaneously:

| Site Identifier | Status | Generation | Primary Loads |
| --- | --- | --- | --- |
| **`zambia`** | Phase 1 (Active) | 50 kW Solar PV + 120 kWh BESS | Hammer mills (2x), Borehole pump, Dormitories, Bakery |
| **`malawi`** | Phase 2 (Base) | 40 kW Solar PV + 90 kWh BESS | Irrigation pumps, Rural health clinic |
| **`kenya`** | Phase 3 (Base) | 60 kW Solar PV + 150 kWh BESS | Cold produce storage, Water purification plant |

To build or run for any site:
```bash
# Zambia (default)
npm run dev

# Malawi
npm run dev:malawi

# Kenya
npm run dev:kenya
```

---

## 3. Strict Database Gatekeeper & Schema Separation

* **Connecting to DB**:
  * In local dev, PostgreSQL/TimescaleDB runs in Docker on port `5432`.
  * Credentials: `app_user` / `app_secure_password`.
* **Adding Tables & Migrations**:
  * Migrations are managed by `dbmate` in `database/migrations/`.
  * See the [Database Architecture Guide](database/README.md) for step-by-step instructions.

---

## 4. Dual-Target Frontend (Desktop Web & Standalone Mobile)

The frontend is an Expo React Native TypeScript application located in `frontend/`.

* **Desktop Web**: Compiled to static HTML/JS via `npm run build:web` and served by Nginx.
* **Standalone Mobile**: Builds native iOS bundle IDs (`org.credit.digitaltwin.<site>`) and Android packages dynamically via `app.config.ts`.
* **Platform Divergence Convention**: Divergent 3D/Canvas rendering is split cleanly into `.web.tsx` and `.native.tsx`.
* See the [Frontend Guide](frontend/README.md) for details.

---

## 5. Quickstart (Single Command Dev Launcher)

### Prerequisites
* Linux or WSL2 (Ubuntu)
* Docker & Docker Compose v2+
* Node.js v18+ & npm v9+
* Python 3.12+

### Launching Local Environment
Clone and run from repository root:
```bash
# 1. Install frontend workspace dependencies
npm install

# 2. Launch local stack (defaults to Zambia)
npm run dev
```

What `npm run dev` (`scripts/dev.sh`) does automatically:
1. Boots containerized PostgreSQL 16 + TimescaleDB.
2. Initializes the `raw` schema and `app_user` role.
3. Applies all `app` schema migrations via `dbmate`.
4. Builds and starts `backend/api` on port `4000` with the `zambia` profile.
5. Polls `http://localhost:4000/health` until HTTP 200 is verified.
6. Launches Expo on the host machine with `EXPO_PUBLIC_SITE_TARGET=zambia`.

---

## 6. Child Documentation Links

Comprehensive guides are provided for each specific subsystem:

* 📚 [Database & Migrations Guide](database/README.md) — Adding tables, TimescaleDB hypertables, columnar compression policies, and migration rules.
* 📚 [Backend Services Guide](backend/README.md) — FastAPI gateway, database gatekeeper rules, adding secondary compute containers, and OpenAPI alignment.
* 📚 [Forecasting Models & BentoML Guide](models/README.md) — Step-by-step tutorial for building, containerizing, and registering BentoML model services.
* 📚 [Frontend Application Guide](frontend/README.md) — Expo Router setup, dynamic multi-site manifests, responsive layouts, and `.web.tsx`/`.native.tsx` divergence.
* 📚 [Site Configuration Manifests Guide](config/sites/README.md) — Schema specification for `zambia.json`, `malawi.json`, and `kenya.json`.
* 📚 [API Contracts Guide](contracts/README.md) — Language-agnostic OpenAPI 3.0 specification.
* 📚 [Production Deployment Guide](deploy/README.md) — Production server layout, pre-flight migration safety, Nginx configuration, and rollbacks.
* 📚 [Pull Request Guidelines](.github/PULL_REQUEST_GUIDELINES.md) — Git workflow, branch naming, TDD expectations, and squash-and-merge governance.

---

## 7. Testing & CI/CD Pipeline

```bash
# Run all tests (frontend + backend)
npm run test

# Run frontend Jest tests only
npm run test:frontend

# Run backend Python tests only
npm run test:backend

# Run frontend TypeScript type-checking
npm run typecheck

# Test database permission isolation
bash scripts/test-db-perms.sh
```

---

## 8. Lead Developer Handover Guide

Upon receiving this verified repository, perform the following steps to finalize deployment governance:

1. **Insert Production Raw Telemetry Schemas**:
   * Open `database/raw/01_init_schemas_and_roles.sql`.
   * Replace `raw.telemetry_placeholder` with the actual ingestion table definitions.
2. **Activate the CI Immutability Guard**:
   * Open `.github/workflows/ci-database.yml`.
   * Uncomment Step 1 (`Verify database/raw/ Immutability`).
3. **Push to GitHub Organization**:
   * Push `main` and `prod` branches.
4. **Configure Branch Rulesets**:
   * On `main`: Require 1 Lead approval, require passing CI matrix checks across all 3 sites, restrict merge strictly to **Squash and merge**.
   * On `prod`: Restrict pushes and merges exclusively to the Lead Developer.
5. **Configure GitHub Environments**:
   * In GitHub Settings > Environments, create `zambia`, `malawi`, and `kenya`.
   * Populate `PROD_SERVER_HOST`, `PROD_SSH_PRIVATE_KEY`, and `DATABASE_URL`.

