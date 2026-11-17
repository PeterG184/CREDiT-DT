#!/usr/bin/env bash
# =============================================================================
# scripts/test-db-perms.sh — Database Permission Smoke Test
# =============================================================================
# Verifies that 'app_user' has SELECT-only privileges on raw schema
# and full read/write privileges on app schema.
# =============================================================================
set -e

DB_CONTAINER="${DB_CONTAINER:-credit-dt-db}"
DB_NAME="credit_dt"
APP_USER="app_user"
APP_PASS="app_secure_password"

echo "=== Running Database Permission Smoke Test ==="

# 1. Verify app_user can SELECT from raw table
echo "--> Test 1: SELECT on raw.telemetry_placeholder..."
docker exec -e PGPASSWORD="${APP_PASS}" "${DB_CONTAINER}" \
    psql -U "${APP_USER}" -d "${DB_NAME}" -c "SELECT count(*) FROM raw.telemetry_placeholder;" > /dev/null
echo "[PASS] app_user successfully executed SELECT on raw schema."

# 2. Verify app_user CANNOT INSERT into raw table
echo "--> Test 2: Reject INSERT on raw.telemetry_placeholder..."
if docker exec -e PGPASSWORD="${APP_PASS}" "${DB_CONTAINER}" \
    psql -U "${APP_USER}" -d "${DB_NAME}" -c "INSERT INTO raw.telemetry_placeholder (site_id) VALUES ('test');" 2>/dev/null; then
    echo "[FAIL] app_user was unexpectedly able to INSERT into raw schema!"
    exit 1
else
    echo "[PASS] INSERT on raw schema was rejected as expected (permission denied)."
fi

# 3. Verify app_user CANNOT ALTER raw table
echo "--> Test 3: Reject ALTER on raw.telemetry_placeholder..."
if docker exec -e PGPASSWORD="${APP_PASS}" "${DB_CONTAINER}" \
    psql -U "${APP_USER}" -d "${DB_NAME}" -c "ALTER TABLE raw.telemetry_placeholder ADD COLUMN test_col text;" 2>/dev/null; then
    echo "[FAIL] app_user was unexpectedly able to ALTER table in raw schema!"
    exit 1
else
    echo "[PASS] ALTER on raw schema was rejected as expected (permission denied)."
fi

# 4. Verify app_user CAN INSERT into app table
echo "--> Test 4: INSERT into app.digital_twin_state..."
docker exec -e PGPASSWORD="${APP_PASS}" "${DB_CONTAINER}" \
    psql -U "${APP_USER}" -d "${DB_NAME}" -c "INSERT INTO app.digital_twin_state (site_id, state_data) VALUES ('zambia', '{\"test\": true}'::jsonb);" > /dev/null
echo "[PASS] app_user successfully executed INSERT on app schema."

echo "=== All Database Permission Tests PASSED ==="

