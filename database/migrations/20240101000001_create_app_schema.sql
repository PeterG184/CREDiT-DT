-- migrate:up
-- =============================================================================
-- Migration: 20240101000001_create_app_schema.sql
-- Description: Initialize core app schema tables, site metadata, digital twin
--              state, and TimescaleDB hypertables with columnar compression.
-- Rules: Strictly app schema ONLY. Never touch raw schema in migrations!
-- =============================================================================

-- 1. Site Metadata Table (Unified Multi-Site Configuration)
CREATE TABLE IF NOT EXISTS app.site_metadata (
    site_id VARCHAR(50) PRIMARY KEY,
    site_name VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    hardware_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Digital Twin Current & Historical State Records
CREATE TABLE IF NOT EXISTS app.digital_twin_state (
    id BIGSERIAL PRIMARY KEY,
    site_id VARCHAR(50) NOT NULL REFERENCES app.site_metadata(site_id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    state_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digital_twin_state_site_time 
    ON app.digital_twin_state (site_id, recorded_at DESC);

-- 3. Model Forecast Output Hypertable (TimescaleDB)
CREATE TABLE IF NOT EXISTS app.forecast_outputs (
    site_id VARCHAR(50) NOT NULL,
    model_id VARCHAR(100) NOT NULL,
    forecast_time TIMESTAMPTZ NOT NULL,
    horizon_hours INT NOT NULL DEFAULT 24,
    prediction JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Convert forecast_outputs to TimescaleDB hypertable partitioned by forecast_time
SELECT create_hypertable('app.forecast_outputs', 'forecast_time', if_not_exists => TRUE);

-- Enable TimescaleDB Columnar Compression (Indefinite Retention - Never Drop Historical Data)
ALTER TABLE app.forecast_outputs SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'site_id, model_id',
    timescaledb.compress_orderby = 'forecast_time DESC'
);

-- Automatically compress chunks older than 7 days
SELECT add_compression_policy('app.forecast_outputs', INTERVAL '7 days', if_not_exists => TRUE);

-- 4. Seed Initial Multi-Site Metadata Records
INSERT INTO app.site_metadata (site_id, site_name, country, hardware_config)
VALUES 
    (
        'zambia', 
        'Zambia Solar Microgrid', 
        'Zambia', 
        '{"status": "active", "solar_capacity_kw": 50.0, "battery_kwh": 120.0, "loads": ["hammer_mill_1", "hammer_mill_2", "water_pump_primary", "dormitories", "bakery"]}'::jsonb
    ),
    (
        'malawi', 
        'Malawi Solar Microgrid', 
        'Malawi', 
        '{"status": "planned", "solar_capacity_kw": 40.0, "battery_kwh": 90.0, "loads": ["irrigation_pump", "health_post"]}'::jsonb
    ),
    (
        'kenya', 
        'Kenya Solar Microgrid', 
        'Kenya', 
        '{"status": "planned", "solar_capacity_kw": 60.0, "battery_kwh": 150.0, "loads": ["cold_storage", "water_purification"]}'::jsonb
    )
ON CONFLICT (site_id) DO NOTHING;

-- Seed initial twin state for Zambia
INSERT INTO app.digital_twin_state (site_id, state_data)
VALUES (
    'zambia',
    '{"microgrid_status": "nominal", "active_power_kw": 28.5, "battery_soc_pct": 82.0, "loads_active": 3}'::jsonb
);

-- migrate:down
-- =============================================================================
-- Migration Rollback
-- =============================================================================
SELECT remove_compression_policy('app.forecast_outputs', if_exists => TRUE);
DROP TABLE IF EXISTS app.forecast_outputs CASCADE;
DROP TABLE IF EXISTS app.digital_twin_state CASCADE;
DROP TABLE IF EXISTS app.site_metadata CASCADE;

