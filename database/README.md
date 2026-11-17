# Database Architecture & Migration Guide (`database/`)

This directory manages the PostgreSQL + TimescaleDB schema definitions, permissions, and migration lifecycle for the Digital Twin platform.

---

## 1. Schema Boundaries & Permissions

The database is divided into two distinct logical schemas:

| Schema | Ownership | Permissions for `backend/api` (`app_user`) | Purpose |
| --- | --- | --- | --- |
| **`raw`** | External Ingestion Pipeline | **`SELECT` Only** (Read-Only) | Raw sensor telemetry streamed directly from site hardware/gateways. |
| **`app`** | This Repository (`database/migrations/`) | **Full Read/Write / DDL** | Digital twin state, processed metrics, alert states, and model forecast outputs. |

> [!IMPORTANT]
> **Strict Gatekeeper Rule**: Only `backend/api` connects to PostgreSQL/TimescaleDB. Frontend apps, secondary compute microservices, and BentoML model containers communicate with `backend/api` over HTTP and **never** connect directly to the database.

---

## 2. Directory Layout

* `database/raw/`: Contains `01_init_schemas_and_roles.sql`. This script creates the `raw` and `app` schemas, provisions the restricted `app_user` database user, applies the permission boundaries, and establishes placeholder raw telemetry tables for local testing and CI. **This file is executed only in local Docker and ephemeral CI containers, never against production.**
* `database/migrations/`: Sequential, reversible SQL migration files applied by `dbmate`. Every migration here manages **only** the `app` schema.

---

## 3. How to Add Tables and Run Migrations

Database migrations are tracked and executed using [dbmate](https://github.com/amacneil/dbmate). All developers apply migrations through the unified root commands or Docker containers.

### Step 1: Create a New Migration File
Run the following from the root directory:
```bash
npm run db:new add_battery_health_table
```
Or with `dbmate` CLI directly:
```bash
dbmate -d database/migrations new add_battery_health_table
```
This generates a timestamped file in `database/migrations/YYYYMMDDHHMMSS_add_battery_health_table.sql`.

### Step 2: Write the Migration SQL
Edit the generated file. You **must** provide both `-- migrate:up` and `-- migrate:down` blocks:

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS app.battery_health (
    id BIGSERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES app.site_metadata(site_id),
    cell_id INT NOT NULL,
    state_of_health_pct NUMERIC(5, 2) NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_battery_health_site_time 
    ON app.battery_health (site_id, recorded_at DESC);

-- migrate:down
DROP TABLE IF EXISTS app.battery_health CASCADE;
```

### Step 3: Guidelines for Multi-Site Tables
1. **Always include `site_id`**: Every table storing site metrics, twin state, or model output must include a `site_id VARCHAR(50)` column so the unified schema cleanly serves Zambia, Malawi, and Kenya.
2. **Use `JSONB` for hardware-specific variance**: Instead of creating site-specific columns (e.g. `hammer_mill_rpm`), store site-specific parameters in indexed `JSONB` metadata columns.

### Step 4: Adding TimescaleDB Hypertables & Compression Policies
When storing time-series outputs (such as telemetry projections or high-frequency state estimates):

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS app.sensor_aggregates (
    site_id VARCHAR(50) NOT NULL,
    bucket TIMESTAMPTZ NOT NULL,
    avg_power_kw DOUBLE PRECISION,
    peak_power_kw DOUBLE PRECISION
);

-- 1. Create hypertable partitioned by time
SELECT create_hypertable('app.sensor_aggregates', 'bucket', if_not_exists => TRUE);

-- 2. Configure columnar compression (order by bucket descending, segment by site)
ALTER TABLE app.sensor_aggregates SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id',
    timescaledb.compress_orderby = 'bucket DESC'
);

-- 3. Add compression policy (compress chunks older than 14 days)
-- NOTE: Never add data retention drop policies! Historical data must be preserved indefinitely.
SELECT add_compression_policy('app.sensor_aggregates', INTERVAL '14 days', if_not_exists => TRUE);

-- migrate:down
SELECT remove_compression_policy('app.sensor_aggregates', if_exists => TRUE);
DROP TABLE IF EXISTS app.sensor_aggregates CASCADE;
```

### Step 5: Apply and Verify Migrations Locally
Run:
```bash
# Apply pending migrations
npm run db:migrate

# Check status
npm run db:status

# Test rollback (verify down migration works cleanly)
npm run db:rollback

# Re-apply
npm run db:migrate
```

---

## 4. Strict CI Migration Rules

CI automatically executes two static and dynamic guards on every Pull Request modifying `database/`:

1. **Static Migration Guard (`ci-database.yml`)**:
   Scans all migration files in `database/migrations/` using regex. If any migration contains `CREATE`, `ALTER`, `DROP`, `INSERT`, `UPDATE`, or `DELETE` targeting the `raw` schema, **the CI build immediately fails**.
2. **Permission Smoke Test**:
   Boots an ephemeral TimescaleDB container, executes `database/raw/` as superuser, runs all migrations as `app_user`, and verifies:
   * `app_user` can `SELECT` from `raw` tables.
   * `app_user` cannot `INSERT` or `ALTER` `raw` tables (returns `permission denied`).

---

## 5. Lead Developer Handover: Inserting Production Raw Schemas

When the physical solar microgrid installation is completed and the ingestion pipeline is operational:

1. Open `database/raw/01_init_schemas_and_roles.sql`.
2. Replace `raw.telemetry_placeholder` with the actual production raw table definitions (columns, indexes, and data types).
3. Open `.github/workflows/ci-database.yml`.
4. Locate the **Immutability Guard** step and uncomment it.
5. Commit to `main` and `prod`. From that moment on, any PR attempting to modify `database/raw/` will be rejected by CI.

