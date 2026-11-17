#!/usr/bin/env bash
# =============================================================================
# deploy/deploy.sh — Production Deployment Script for Dedicated Site Server
# =============================================================================
# Executed as root inside /opt/digital-twin on the dedicated production server.
# =============================================================================
set -e

REPO_DIR="/opt/digital-twin"
WEB_ROOT="/var/www/digital-twin-web"
ENV_FILE="${REPO_DIR}/.env.production"

echo "=========================================================="
echo " Starting Production Deployment on Dedicated Server"
echo " Time: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
echo "=========================================================="

# 1. Verify working directory
if [ "$(pwd)" != "${REPO_DIR}" ]; then
    echo "--> Navigating to repository directory: ${REPO_DIR}"
    cd "${REPO_DIR}"
fi

# 2. Verify .env.production exists
if [ ! -f "${ENV_FILE}" ]; then
    echo "[ERROR] Missing ${ENV_FILE}. This file must define SITE_TARGET and DATABASE_URL."
    exit 1
fi

# Source environment variables for deployment
set -a
source "${ENV_FILE}"
set +a

if [ -z "${SITE_TARGET}" ]; then
    echo "[ERROR] SITE_TARGET is not defined in ${ENV_FILE}."
    exit 1
fi

if [ -z "${DATABASE_URL}" ]; then
    echo "[ERROR] DATABASE_URL is not defined in ${ENV_FILE}."
    exit 1
fi

echo "--> Active Production Target: ${SITE_TARGET}"

# 3. Pre-flight Database Migrations (Abort immediately if migration fails before touching containers)
echo "--> [1/4] Running pre-flight database migrations against host PostgreSQL..."
docker compose -f docker-compose.prod.yml run --rm migration-runner up
echo "[OK] Pre-flight database migrations completed successfully."

# 4. Build Static Expo Web Bundle Directly on Host OS
echo "--> [2/4] Building static Expo web export on host OS..."
export EXPO_PUBLIC_SITE_TARGET="${SITE_TARGET}"

# Install any missing production frontend dependencies
npm install --prefix frontend --omit=dev

# Export static HTML/JS bundle for web
npm run build:web --prefix frontend

# Ensure web root directory exists and copy bundle
mkdir -p "${WEB_ROOT}"
echo "--> Copying web bundle into Nginx root: ${WEB_ROOT}..."
cp -r frontend/dist/* "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}" || true
echo "[OK] Static web bundle published to Nginx web root."

# 5. Rebuild and Restart Production Containers
echo "--> [3/4] Rebuilding and restarting production containers with profile: ${SITE_TARGET}..."
docker compose -f docker-compose.prod.yml --profile "${SITE_TARGET}" up -d --build --remove-orphans

# 6. Gated Health Check Loop
echo "--> [4/4] Verifying production service health via localhost:4000/health..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTH_URL="http://127.0.0.1:4000/health"

until curl -s -f "${HEALTH_URL}" > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "[ERROR] Production backend failed health check after deployment!"
        docker compose -f docker-compose.prod.yml logs backend-api
        exit 1
    fi
    echo "    Polling backend health... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

echo "=========================================================="
echo " [SUCCESS] Deployment completed successfully for ${SITE_TARGET}!"
echo "=========================================================="

