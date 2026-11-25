#!/usr/bin/env bash
# ==============================================================================
# CareID Enterprise OCR — Manual / Standalone Start Script
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${APP_DIR}"

if [ -f "${APP_DIR}/.env" ]; then
  echo "Loading environment from ${APP_DIR}/.env"
  # Export non-comment lines
  set -a
  source "${APP_DIR}/.env"
  set +a
fi

VENV_PYTHON="${APP_DIR}/venv/bin/python"
if [ ! -f "${VENV_PYTHON}" ]; then
  if command -v python3.11 &>/dev/null; then
    VENV_PYTHON="python3.11"
  else
    VENV_PYTHON="python3"
  fi
fi

HOST="${CAREID_OCR_HOST:-0.0.0.0}"
PORT="${CAREID_OCR_PORT:-5050}"
WORKERS="${CAREID_OCR_WORKERS:-1}"

echo "Starting CareID OCR Microservice on http://${HOST}:${PORT} (Workers: ${WORKERS})..."
exec "${VENV_PYTHON}" -m uvicorn app.main:app \
  --host "${HOST}" \
  --port "${PORT}" \
  --workers "${WORKERS}" \
  --log-level info

