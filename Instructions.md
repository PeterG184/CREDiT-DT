# Digital Twin Cloud Platform — Repository Setup & Architecture Specification

## 1. Purpose & Handover Scope

This document defines the complete architecture, directory layout, multi-site build system, database boundaries, testing baseline, and deployment mechanics for the Digital Twin cloud repository.

* **Developer Responsibility**: Initialize and configure the entire repository locally according to the specifications below, verify that the local Docker stack, database migrations, smoke tests, and cross-platform builds succeed cleanly across all site targets, and deliver the ready-to-push local Git repository.
* **Lead Developer Responsibility**: Upon receiving the verified local repository, insert the final production raw table definitions into `database/raw/`, enable the raw-table immutability check in CI, push the repository to the GitHub Organization, configure branch protection rulesets for `main` and `prod`, and populate GitHub Environments and Secrets for each dedicated site server.

---

## 2. Core Architectural Principles

1. **Multi-Site Build-Time Targets (`zambia`, `malawi`, `kenya`)**:
The platform will be deployed across three independent sites in phased rollout order: **Zambia** first, **Malawi** second, and **Kenya** third. Each site has distinct hardware setups and visualization requirements while sharing the same foundational platform. All three sites live in a single repository and are selected at build time via the `SITE_TARGET` flag (defaulting to `zambia`).
2. **Independent Dedicated Site Servers**:
Each site (Zambia, Malawi, and Kenya) runs on its own dedicated, standalone production server with its own host-installed database, containers, and Nginx web server. There is no cross-site communication, data replication, or shared infrastructure between the three deployments.
3. **Sole Database Gatekeeper**:
Only the primary backend API service (`backend/api`) is permitted to connect to PostgreSQL/TimescaleDB. Neither the frontend application, BentoML forecasting models, nor any secondary compute services may connect directly to the database. All inter-service data exchange occurs over internal HTTP endpoints.
4. **Strict Database Schema Separation (`raw` vs. `app`)**:
Each site's PostgreSQL + TimescaleDB instance is divided into two logical schemas:
* **`raw` Schema (Read-Only)**: Owned and populated exclusively by an external raw ingestion pipeline outside this repository. The backend API has `SELECT`-only permissions on `raw` tables.
* **`app` Schema (Read/Write)**: Owned by this repository for derived data, digital twin state, and model forecast outputs. Historical records must be retained indefinitely in live storage (no data-dropping retention policies) with TimescaleDB columnar compression enabled for query performance.


5. **Backend Language Agnosticism**:
Aside from PostgreSQL/TimescaleDB, BentoML for model packaging, and Expo React Native for the frontend, the repository imposes no language restrictions on backend services. Developers may build `backend/api` and secondary processing services in any language or combination of languages (such as Go, Python, Rust, Node.js, or C#), provided every service is containerized and exposes an HTTP `/health` endpoint.
6. **Additive Forecasting Models (`models/`)**:
Forecasting models will be added later using Python and packaged via BentoML as isolated microservices (one container per model, with lightweight weights committed directly into the repository). Do not create sample models during initial setup; provide clear documentation outlining the integration rules and site-profile registration.
7. **Dual-Target Frontend (Desktop Web & Standalone Mobile Apps)**:
The frontend must target both **desktop web browsers** (hosted directly on each site server via Nginx) and **standalone native mobile applications** (iOS and Android builds distributed independently per site) from a single Expo React Native codebase.

---

## 3. Multi-Site Build & Standalone Distribution Architecture

To ensure all three site versions compile simultaneously and never drift out of sync during phased development (Zambia → Malawi → Kenya), implement the following build-time architecture:

| Layer | Build-Time Mechanism | Implementation Specification |
| --- | --- | --- |
| **Site Manifests (`config/sites/`)** | `zambia.json`, `malawi.json`, `kenya.json` | Single source of truth per site defining hardware/sensor profiles, expected raw metric keys, active visualization feature flags, map/3D asset references, required BentoML model identifiers, the site's production API base URL, and standalone mobile app metadata (display name, iOS bundle identifier, and Android package name). Initialize `zambia.json` for active development and `malawi.json` / `kenya.json` as valid base manifests so all three targets build from day one. |
| **Frontend Web & Standalone Mobile** | `EXPO_PUBLIC_SITE_TARGET` + dynamic `app.config.ts` | Reads `SITE_TARGET` at build/export time to load the corresponding site manifest, inject that site's API endpoint, configure standalone mobile bundle identifiers and app icons/names for iOS and Android builds, and conditionally resolve site-specific visualization modules and 3D assets so unused site assets are excluded from the compiled web or mobile bundle. |
| **Backend & Models (Docker)** | Docker build `ARG SITE_TARGET` + Compose Profiles | Passes `SITE_TARGET` into image builds and tags images by site. Uses Docker Compose profiles (`zambia`, `malawi`, `kenya`) so each deployment builds and starts only the BentoML model containers and compute services required by that site's hardware. |
| **Database (`app.*` Schema)** | Unified schema with `site_id` and `JSONB` metadata | Maintain one unified SQL migration track across all three sites rather than separate schema directories. Store site-specific hardware parameters in flexible `JSONB` columns and tag records with a `site_id` column. |
| **Local Development** | Environment flag on root dev command | Defaults to `zambia` with zero configuration when running the root dev command, while allowing any developer to launch Malawi or Kenya locally by prefixing `SITE_TARGET=malawi` or `SITE_TARGET=kenya`. |

---

## 4. Required Directory Structure & Deliverables

Set up the local repository with the following folder hierarchy and responsibilities:

* **Root Directory**:
* **Root Workspace Configuration (`package.json`)**: Configures workspace management for the frontend and provides top-level convenience commands for launching the local environment, stopping containers, running/rolling back database migrations, running tests, and exporting the static web bundle.
* **Local Orchestration (`docker-compose.yml`)**: Defines the zero-configuration local development environment on a private bridge network, including a containerized PostgreSQL 16 + TimescaleDB instance (for local parity), a containerized SQL migration runner (such as `dbmate`), and `backend/api` configured with `SITE_TARGET` build arguments and site profiles.
* **Production Orchestration (`docker-compose.prod.yml`)**: Defines the production container stack for a single dedicated site server. Because PostgreSQL/TimescaleDB is installed directly on the host OS in production, `docker-compose.prod.yml` must not launch a database container; instead, it configures the migration runner and `backend/api` to reach the host OS database (via host gateway networking) and binds `backend/api` to localhost port 4000 so the host's Nginx reverse proxy can route external HTTPS traffic to it.
* **Ignore Files (`.gitignore`, `.dockerignore`)**: Excludes dependency caches, build artifacts, Expo temporary folders, native build outputs, local BentoML caches, and environment files (`.env`, `.env.production`).
* **Root Documentation (`README.md`)**: Documents the architecture, multi-site build flag usage (`SITE_TARGET`), standalone mobile vs. desktop web targets, database access rules, and the single-command quickstart workflow.


* **Site Configuration (`config/sites/`)**:
* Contains `zambia.json`, `malawi.json`, and `kenya.json` along with a `README.md` documenting the manifest schema, standalone mobile bundle ID conventions, production API URL fields, and instructions for enabling site-specific visualizations and model containers as Malawi and Kenya enter active development.


* **Database Layer (`database/`)**:
* **Placeholder Raw Schema (`database/raw/`)**: Contains a clean placeholder SQL build script defining the `raw` and `app` schemas, creating the restricted `app_user` database role, defining a representative placeholder `raw` telemetry table (to be replaced by the Lead Developer before pushing to GitHub), granting `SELECT`-only privileges on `raw` to `app_user`, and granting full privileges on `app` to `app_user`. This folder is mounted into the local TimescaleDB container's initialization directory for local and CI testing, and is never executed in production.
* **Application Migrations (`database/migrations/`)**: Contains sequential, reversible SQL migration files managing only `app` schema tables (including `site_id` columns and `JSONB` hardware configuration fields, plus forecast output hypertables with TimescaleDB compression policies).


* **API Contracts (`contracts/`)**:
* **Language-Agnostic Specification (`contracts/openapi.yaml`)**: Provides an OpenAPI specification defining shared HTTP contracts (starting with `/health` and active site metadata endpoints) so any backend language and the TypeScript frontend remain aligned.


* **Backend Services (`backend/`)**:
* **Primary API Gatekeeper (`backend/api/`)**: Contains a minimal starter HTTP service exposing `GET /health` (reporting service status and the active `SITE_TARGET`) on port 4000, a self-contained `Dockerfile` accepting `ARG SITE_TARGET`, and an initial startup smoke test in `backend/api/tests/`.
* **Backend Guide (`backend/README.md`)**: Explains how developers can replace or extend `backend/api` in any language, how to add secondary compute containers on the internal network, how to read site configuration manifests, and enforces the rule that only `backend/api` communicates with PostgreSQL.


* **Forecasting Models (`models/`)**:
* **Models Guide (`models/README.md`)**: Empty of model code at initialization, containing documentation specifying that each model must live in its own subdirectory, use BentoML to build an isolated container with committed weights, attach to the relevant Compose site profile(s), operate strictly on the internal Docker network, and return predictions over HTTP to `backend/api` rather than writing directly to the database.


* **Frontend Application (`frontend/`)**:
* **Expo React Native Setup**: Configured with TypeScript, Expo SDK, dynamic `app.config.ts` reading `EXPO_PUBLIC_SITE_TARGET` (configuring standalone iOS/Android bundle identifiers, app names, and site API URLs), Metro bundler configured for monorepo root workspace resolution, Jest + React Native Testing Library, and static web export enabled.
* **Site-Aware Visualization Routing (`frontend/src/`)**: Implements a clean site-module resolver pattern so shared layouts and navigation wrap site-specific visualization screens (`zambia`, `malawi`, `kenya`), plus a responsive starter screen that adapts between mobile and desktop viewport widths, displays the active site target, and checks the backend `/health` endpoint. Includes a passing component smoke test in `frontend/tests/`.
* **Frontend Guide (`frontend/README.md`)**: Documents the dual desktop browser and standalone mobile targets, explains why Expo runs on the host OS rather than inside Docker (both in local dev and when building static web assets on the production host), explains how build-time site manifests switch visualizations and 3D assets, and establishes the convention of splitting diverging platform code (such as WebGL vs. native 3D canvases) into `.web.tsx` and `.native.tsx` files.


* **Automation & Deployment Scripts (`scripts/` & `deploy/`)**:
* **Local Launcher (`scripts/dev.sh`)**: Single-command script that defaults `SITE_TARGET` to `zambia` (unless overridden), starts the local Docker containers (including local TimescaleDB) with the active site profile, runs migrations, polls `http://localhost:4000/health` until ready, and launches Expo on the host machine with `EXPO_PUBLIC_SITE_TARGET` set.
* **Production Deploy (`deploy/deploy.sh`)**: Executed as `root` inside `/opt/digital-twin` on each site's dedicated host server upon production releases. Verifies `.env.production` exists (which defines that server's `SITE_TARGET` and host `DATABASE_URL`), runs pre-flight `app` schema migrations against the host OS database (aborting immediately if a migration fails before touching live containers), builds the static Expo web bundle directly on the host OS and copies the output into Nginx's web root (`/var/www/digital-twin-web`), rebuilds and restarts the site's production containers, and gates completion on a `/health` polling loop.
* **Manual Rollback (`deploy/rollback.sh`)**: Standalone script reserved for the Lead Developer to manually revert a site server to a specified Git commit hash or tag, re-export that site's static web bundle on the host OS into `/var/www/digital-twin-web`, rebuild its containers, and verify `/health`.


* **GitHub Workflows & Guidelines (`.github/`)**:
* **PR Guidelines (`.github/PULL_REQUEST_GUIDELINES.md`)**: Documents issue-based branch naming off `main`, Test-Driven Development expectations, multi-site compatibility rules, strict immutability of `database/raw/` (once populated), database gatekeeper rules, and Squash-and-merge review requirements.
* **CI & Deployment Workflows (`.github/workflows/`)**: Four workflow files detailed in Section 6.



---

## 5. Local Development Environment Requirements

* **Zero Configuration**: Developers must be able to clone the repository, install dependencies, and run a single command from the root directory to launch the entire local stack without manually creating `.env` files or configuring credentials.
* **Container vs. Host Split**:
* In local development, PostgreSQL/TimescaleDB, the SQL migration runner, `backend/api`, and any future model or compute containers run inside Docker Compose.
* The Expo React Native frontend runs directly on the developer's host OS so hot-reloading, desktop browser previews, mobile emulators, and standalone native builds work without container networking friction.



---

## 6. Test-Driven Development (TDD) & Multi-Site CI/CD Specifications

All Pull Request workflows must run **only on Pull Requests targeting `main` or `prod**` (never on raw pushes to feature branches) and must use **path filters** so checks execute only when relevant subsystems change.

1. **Database CI (`ci-database.yml` — triggers on `database/**`)**:
* **Immutability Guard (Initially Commented Out)**: Include the step that compares the PR against the base branch and fails if any file inside `database/raw/` was modified, renamed, or deleted, **but leave this specific step commented out** with a clear comment instructing the Lead Developer to uncomment it once the final production raw table definitions have been committed.
* **Static Migration Guard (Active)**: Scans `database/migrations/` and fails the build if any migration attempts to create, alter, drop, insert, update, or delete objects in the `raw` schema.
* **Permission Smoke Test (Active)**: Boots an ephemeral TimescaleDB container, initializes `database/raw/` as superuser, runs `database/migrations/` using `app_user`, and verifies that `app_user` can `SELECT` from `raw` tables while `INSERT` and `ALTER` operations fail with permission errors.


2. **Backend Multi-Site CI (`ci-backend.yml` — triggers on `backend/**`, `config/sites/**`, and `docker-compose.yml`)**:
* Runs a parallel build matrix across `[zambia, malawi, kenya]`. For each site target, builds the local Docker Compose stack with that site's `SITE_TARGET` and Compose profile, and executes the startup smoke test verifying that `backend/api` boots cleanly and returns HTTP 200 on `/health`.


3. **Frontend Multi-Site CI (`ci-frontend.yml` — triggers on `frontend/**`, `config/sites/**`, and root workspace files)**:
* Runs a parallel build matrix across `[zambia, malawi, kenya]`. For each site target, runs TypeScript type-checking, executes the Jest unit/smoke test suite, and verifies that the static desktop web export compiles cleanly with `EXPO_PUBLIC_SITE_TARGET` set to that site.


4. **Multi-Server Production Deployment (`deploy-prod.yml` — triggers on push/merge to `prod`)**:
* Uses a deployment matrix across GitHub Environments (`zambia`, `malawi`, `kenya`). Each site job connects via SSH as `root` to that country's dedicated server using environment-scoped secrets, navigates to `/opt/digital-twin`, pulls the latest `prod` branch, writes `.env.production` (containing `SITE_TARGET` and the host OS `DATABASE_URL`) from GitHub Secrets, and executes `deploy/deploy.sh`. If a site's server host secret is not yet configured (such as Malawi or Kenya prior to hardware rollout), that site's job skips gracefully without blocking active deployments.



---

## 7. Production Server Environment Assumptions

Each site's dedicated production server is provisioned with the following host-level layout and defaults:

* **Repository Path**: `/opt/digital-twin`
* **Nginx Web Root**: `/var/www/digital-twin-web` (Nginx proxies `/api/*` to `[http://127.0.0.1:4000](http://127.0.0.1:4000)` and serves static files from `/var/www/digital-twin-web`)
* **Host-Installed Services**: PostgreSQL + TimescaleDB, Node.js (v20+), Docker Engine + Docker Compose plugin, Git, and Nginx run directly on the host OS.
* **Deployment Privileges**: Automated SSH deployments and manual rollbacks execute with `root` privileges, avoiding `sudo` prompt issues when updating `/var/www/digital-twin-web` or managing Docker containers.

---

## 8. Developer Pre-Handover Verification Checklist

Before handing the local repository back to the Lead Developer, verify all of the following on a clean machine state:

* [ ] All shell scripts (`scripts/dev.sh`, `deploy/deploy.sh`, `deploy/rollback.sh`, and test scripts) have executable permissions.
* [ ] Running the single root development command from a clean state defaults to `zambia`, boots containerized TimescaleDB, initializes the placeholder `raw` schema, applies `app` migrations, starts `backend/api`, passes the `/health` check, and launches Expo on the host machine without requiring any manual `.env` setup.
* [ ] Running the local development command with `SITE_TARGET=malawi` and `SITE_TARGET=kenya` builds and boots cleanly for both additional site targets.
* [ ] Connecting to the local database as `app_user` confirms `SELECT` works on `raw` tables, full read/write works on `app` tables, and write/alter queries against `raw` tables are rejected.
* [ ] Frontend TypeScript checks, Jest smoke tests, and static web exports complete with zero errors across all three targets (`zambia`, `malawi`, `kenya`), and `app.config.ts` resolves distinct standalone mobile bundle identifiers and API URLs per site.
* [ ] The `database/raw/` immutability step in `.github/workflows/ci-database.yml` is present and clearly commented out for the Lead Developer to enable after adding the production raw table definitions.
* [ ] The repository is initialized locally with a default `main` branch and a matching `prod` branch containing clean initial commit history.

---

## 9. Lead Developer Post-Handover Setup (GitHub & Dedicated Servers)

Once the developer delivers the verified local repository, complete these steps to finalize the raw schema, activate governance, and enable independent site deployments:

1. **Insert Production Raw Schema & Enable CI Lock**: Replace the placeholder SQL in `database/raw/` with the actual `CREATE TABLE` definitions from your raw ingestion pipeline, uncomment the `database/raw/` immutability check in `.github/workflows/ci-database.yml`, and commit the change to `main` and `prod`.
2. **Publish to GitHub Organization**: Create the new repository under your GitHub Organization and push both `main` and `prod` branches.
3. **Configure `main` Branch Ruleset**:
* Require a Pull Request before merging with **1 required approval** (Lead Developer) and dismiss stale approvals on new commits.
* Require passing status checks from the CI workflows across all three site targets (`verify-database-rules`, `build-and-smoke-test (zambia)`, `build-and-smoke-test (malawi)`, `build-and-smoke-test (kenya)`, and the three frontend matrix jobs).
* Restrict merge methods strictly to **Squash and merge**.
* Block force pushes and branch deletions, leaving the bypass list empty.


4. **Configure `prod` Branch Ruleset**:
* Restrict branch creation, updates, and Pull Request merges exclusively to your Lead Developer account so developers cannot target or push to `prod`.
* Block force pushes and branch deletions.


5. **Configure GitHub Environments per Site (`zambia`, `malawi`, `kenya`)**:
* Under **Settings > Environments**, create three separate environments named `zambia`, `malawi`, and `kenya`.
* Inside each site's environment as its dedicated server comes online, add its isolated secrets: `SITE_TARGET` (`zambia`, `malawi`, or `kenya`), `PROD_SERVER_HOST`, `PROD_SERVER_USER` (`root`), `PROD_SSH_PRIVATE_KEY`, `PROD_SERVER_PORT` (if non-standard), and `DATABASE_URL` (pointing to that server's host OS PostgreSQL instance using `app_user` credentials).