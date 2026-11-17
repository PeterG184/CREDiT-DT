#!/usr/bin/env bash
# =============================================================================
# scripts/dev.sh — Zero-Configuration Local Development Launcher
# =============================================================================
set -e

# Default SITE_TARGET to zambia if not specified
export SITE_TARGET="${SITE_TARGET:-zambia}"
export EXPO_PUBLIC_SITE_TARGET="${SITE_TARGET}"

echo "=========================================================="
echo " Starting CREDiT Digital Twin Local Stack"
echo " Active Target Site: ${SITE_TARGET}"
echo "=========================================================="

# Check Docker is accessible
if ! command -v docker &> /dev/null; then
    echo "[ERROR] Docker is not installed or not in PATH."
    exit 1
fi

# 1. Start local Docker containers with the active site profile
echo "--> [1/4] Booting TimescaleDB and building backend/api container..."
docker compose --profile "${SITE_TARGET}" up -d --build

# 2. Wait for dbmate migrations to finish
echo "--> [2/4] Verifying database migrations..."
docker compose run --rm migration-runner up

# 3. Poll backend /health endpoint until HTTP 200
echo "--> [3/4] Polling backend health endpoint (http://localhost:4000/health)..."
MAX_RETRIES=30
RETRY_COUNT=0
HEALTH_URL="http://localhost:4000/health"

until curl -s -f "${HEALTH_URL}" > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "[ERROR] Backend service failed to become healthy within 30 seconds."
        docker compose logs backend-api
        exit 1
    fi
    echo "    Waiting for backend... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 1
done

echo "[OK] Backend is healthy and connected to database!"
curl -s "${HEALTH_URL}" | grep -o '"status":"[^"]*"' || true
echo ""

# 4. Launch Expo frontend on the host machine
echo "--> [4/4] Launching Expo frontend on host (SITE_TARGET=${SITE_TARGET})..."
echo "=========================================================="
echo " Web Preview: http://localhost:8081"
echo " Backend API: http://localhost:4000"
echo " Database:    localhost:5432 (credit_dt)"
echo " Press Ctrl+C to stop the Expo dev server"
echo "=========================================================="

npm run start --prefix frontend

