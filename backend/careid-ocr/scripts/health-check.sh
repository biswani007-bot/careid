#!/usr/bin/env bash
# ==============================================================================
# CareID Enterprise OCR — Automated Health Check & Readiness Probe
# ==============================================================================

set -euo pipefail

TARGET_URL="${1:-http://127.0.0.1:5050}"
SECRET="${CAREID_OCR_SECRET:-}"

echo "=================================================================="
echo " Checking CareID OCR Microservice Health at: ${TARGET_URL}"
echo "=================================================================="

# 1. Health Probe
echo -n "1. Checking GET /health ... "
HEALTH_RESPONSE=$(curl -s -m 5 "${TARGET_URL}/health" || echo "")

if [ -z "${HEALTH_RESPONSE}" ]; then
  echo "FAILED (No response or connection refused)"
  exit 1
fi

STATUS=$(echo "${HEALTH_RESPONSE}" | grep -o '"status":"[^"]*"' | cut -d':' -f2 | tr -d '"')
ENGINE_READY=$(echo "${HEALTH_RESPONSE}" | grep -o '"engineReady":[^,}]*' | cut -d':' -f2)

if [ "${STATUS}" == "ok" ] && [ "${ENGINE_READY}" == "true" ]; then
  echo "PASSED (status: ${STATUS}, engineReady: ${ENGINE_READY})"
else
  echo "DEGRADED (status: ${STATUS}, engineReady: ${ENGINE_READY})"
  exit 1
fi

# 2. Readiness Probe
echo -n "2. Checking GET /ready ... "
READY_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 "${TARGET_URL}/ready")
if [ "${READY_CODE}" -eq 200 ]; then
  echo "PASSED (HTTP 200)"
else
  echo "FAILED (HTTP ${READY_CODE})"
  exit 1
fi

# 3. Version Check (if secret is available)
if [ -n "${SECRET}" ]; then
  echo -n "3. Checking GET /internal/ocr/version (with secret) ... "
  VERSION_CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 5 \
    -H "X-CareID-Internal-Secret: ${SECRET}" \
    "${TARGET_URL}/internal/ocr/version")
  if [ "${VERSION_CODE}" -eq 200 ]; then
    echo "PASSED (HTTP 200)"
  else
    echo "FAILED (HTTP ${VERSION_CODE})"
  fi
fi

echo "=================================================================="
echo " All Health & Readiness Checks Passed!"
echo " Raw /health response:"
echo "${HEALTH_RESPONSE}"
echo "=================================================================="

