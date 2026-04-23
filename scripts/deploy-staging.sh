#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="deploy@103.235.75.99"
REMOTE_DIR="/home/deploy/caresync"
COMPOSE_FILE="docker-compose.staging.yml"

# Generate secrets if not provided via env
JWT_SECRET="${JWT_SECRET:-$(openssl rand -hex 32)}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(openssl rand -hex 32)}"

echo "==> Syncing source to VPS..."
rsync -az --delete \
  --exclude='.git' \
  --exclude='node_modules' \
  --exclude='apps/*/node_modules' \
  --exclude='apps/web/dist' \
  --exclude='apps/e2e' \
  --exclude='.env*' \
  /Users/ekkisyam/Learn/caresync/ \
  "${DEPLOY_HOST}:${REMOTE_DIR}/"

echo "==> Writing .env.staging on VPS..."
ssh "${DEPLOY_HOST}" "cat > ${REMOTE_DIR}/.env.staging <<EOF
JWT_SECRET=${JWT_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
EOF"

echo "==> Building and starting containers..."
ssh "${DEPLOY_HOST}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} --env-file .env.staging up -d --build"

echo "==> Waiting for services to be healthy..."
ssh "${DEPLOY_HOST}" "cd ${REMOTE_DIR} && docker compose -f ${COMPOSE_FILE} ps"

echo "==> Done. caresync is running on port 8181"
