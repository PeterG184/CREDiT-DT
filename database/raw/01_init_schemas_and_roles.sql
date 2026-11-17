-- =============================================================================
-- PLACEHOLDER RAW SCHEMA & ROLE INITIALIZATION SCRIPT
-- =============================================================================
-- IMPORTANT NOTICE FOR LEAD DEVELOPER:
-- This file is a placeholder executed ONLY during local development container
-- initialization and CI permission tests. It is NEVER executed against production.
-- Before pushing to the GitHub Organization, replace the raw table definitions
-- below with the final production raw table schemas from the ingestion pipeline.
-- =============================================================================

-- Enable TimescaleDB extension if not already present
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- 1. Create Logical Schemas
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS app;

-- 2. Create the Restricted Application Database Role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user WITH LOGIN PASSWORD 'app_secure_password';
    END IF;
END
$$;

-- 3. Define Representative Placeholder Raw Telemetry Table
-- (To be replaced by the Lead Developer with production raw table definitions)
CREATE TABLE IF NOT EXISTS raw.telemetry_placeholder (
    id BIGSERIAL PRIMARY KEY,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    site_id VARCHAR(50) NOT NULL DEFAULT 'zambia',
    payload JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Seed representative record for smoke testing
INSERT INTO raw.telemetry_placeholder (site_id, payload)
VALUES ('zambia', '{"status": "active_test", "voltage_v": 230.0, "current_a": 12.5}'::jsonb);

-- 4. Strict Permissions Separation:
-- 'app_user' has SELECT-only privileges on the 'raw' schema
GRANT USAGE ON SCHEMA raw TO app_user;
GRANT SELECT ON ALL TABLES IN SCHEMA raw TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA raw GRANT SELECT ON TABLES TO app_user;

-- 'app_user' has full Read/Write/DDL privileges on the 'app' schema
GRANT USAGE, CREATE ON SCHEMA app TO app_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA app TO app_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL PRIVILEGES ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT ALL PRIVILEGES ON SEQUENCES TO app_user;

