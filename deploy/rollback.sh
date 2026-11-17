#!/usr/bin/env bash
# =============================================================================
# deploy/rollback.sh — Manual Production Rollback Script
# =============================================================================
# Reserved for Lead Developer use to revert a dedicated site server
# to a known stable Git commit hash or release tag.
# =============================================================================
set -e

REPO_DIR="/opt/digital-twin"
WEB_ROOT="/var/www/digital-twin-web"
ENV_FILE="${REPO_DIR}/.env.production"

TARGET_COMMIT="$1"

if [ -z "${TARGET_COMMIT}" ]; then
    echo "Usage: $0 <git-commit-hash-or-tag>"
    echo "Example: $0 v1.0.1 or $0 7a3f8c2"
    exit 1
fi

echo "=========================================================="
echo " Manual Production Rollback Initiated"
echo " Target Commit/Tag: ${TARGET_COMMIT}"
echo "=========================================================="

cd "${REPO_DIR}"

if [ ! -f "${ENV_FILE}" ]; then
    echo "[ERROR] Missing ${ENV_FILE}."
    exit 1
fi

set -a
source "${ENV_FILE}"
set +a

# 1. Fetch and checkout specified Git commit/tag
echo "--> [1/4] Checking out ${TARGET_COMMIT}..."
git fetch origin
git checkout "${TARGET_COMMIT}"

# 2. Re-export static web bundle on host OS
echo "--> [2/4] Rebuilding static web bundle for ${SITE_TARGET}..."
export EXPO_PUBLIC_SITE_TARGET="${SITE_TARGET}"
npm install --prefix frontend --omit=dev
npm run build:web --prefix frontend

echo "--> Copying rolled-back web bundle to ${WEB_ROOT}..."
mkdir -p "${WEB_ROOT}"
cp -r frontend/dist/* "${WEB_ROOT}/"
chown -R www-data:www-data "${WEB_ROOT}" || true

# 3. Rebuild and restart production containers
echo "--> [3/4] Rebuilding containers for profile ${SITE_TARGET}..."
docker compose -f docker-compose.prod.yml --profile "${SITE_TARGET}" up -d --build --remove-orphans

# 4. Verify /health
echo "--> [4/4] Verifying health check on localhost:4000/health..."
MAX_RETRIES=20
RETRY_COUNT=0
HEALTH_URL="http://127.0.0.1:4000/health"

until curl -s -f "${HEALTH_URL}" > /dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ ${RETRY_COUNT} -ge ${MAX_RETRIES} ]; then
        echo "[ERROR] Backend failed health check after rollback!"
        docker compose -f docker-compose.prod.yml logs backend-api
        exit 1
    fi
    echo "    Polling backend health... (${RETRY_COUNT}/${MAX_RETRIES})"
    sleep 2
done

echo "=========================================================="
echo " [SUCCESS] Rollback to ${TARGET_COMMIT} completed cleanly."
echo "=========================================================="

