#!/usr/bin/env bash
# ==============================================================================
# CareID Enterprise Standalone OCR Microservice — Linux Installation Script
# Target Tested Distributions:
#   - Ubuntu 24.04 LTS (Native python3.11 / python3.12)
#   - Ubuntu 22.04 LTS (via deadsnakes PPA if python3.11 not pre-installed)
#   - Debian 12 (Bookworm - Native python3.11)
#   - RHEL / Rocky Linux / AlmaLinux 9 (via dnf python3.11)
# ==============================================================================

set -euo pipefail

INSTALL_DIR="/opt/careid-ocr"
SERVICE_USER="www"
SERVICE_GROUP="www"

echo "=================================================================="
echo " Starting CareID Standalone OCR Installation"
echo " Target Directory: ${INSTALL_DIR}"
echo "=================================================================="

# 1. Verify root privileges
if [ "$EUID" -ne 0 ]; then
  echo "Error: install.sh must be run as root (or with sudo)." >&2
  exit 1
fi

# 2. Check if a suitable Python (>= 3.10, < 3.13) is already installed
PYTHON_BIN=""
for candidate in python3.11 python3; do
  if command -v "${candidate}" &>/dev/null; then
    if "${candidate}" -c "import sys; sys.exit(0 if sys.version_info >= (3, 10) and sys.version_info < (3, 13) else 1)" 2>/dev/null; then
      PYTHON_BIN="$(command -v "${candidate}")"
      echo "Found compatible Python interpreter: ${PYTHON_BIN} ($("${PYTHON_BIN}" --version))"
      break
    fi
  fi
done

# 3. If no compatible Python found, perform distribution-specific package installation
if [ -z "${PYTHON_BIN}" ]; then
  echo "Compatible Python 3.10-3.12 not found. Detecting operating system..."
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_ID="${ID:-}"
    OS_VERSION_ID="${VERSION_ID:-}"
    echo "Detected OS: ${OS_ID} ${OS_VERSION_ID}"

    if [ "${OS_ID}" = "ubuntu" ]; then
      apt-get update -qq
      apt-get install -y -qq software-properties-common curl
      if [ "${OS_VERSION_ID}" = "22.04" ]; then
        echo "Configuring deadsnakes PPA for Ubuntu 22.04 LTS..."
        add-apt-repository -y ppa:deadsnakes/ppa
        apt-get update -qq
      fi
      apt-get install -y -qq python3.11 python3.11-venv python3.11-dev libgomp1 libgl1 libglib2.0-0
      PYTHON_BIN="$(command -v python3.11)"
    elif [ "${OS_ID}" = "debian" ]; then
      apt-get update -qq
      apt-get install -y -qq python3.11 python3.11-venv python3.11-dev libgomp1 libgl1 libglib2.0-0 curl
      PYTHON_BIN="$(command -v python3.11)"
    elif [ "${OS_ID}" = "rhel" ] || [ "${OS_ID}" = "rocky" ] || [ "${OS_ID}" = "almalinux" ] || [ "${OS_ID}" = "centos" ]; then
      dnf install -y -q python3.11 python3.11-devel mesa-libGL libgomp glib2 curl
      PYTHON_BIN="$(command -v python3.11)"
    else
      echo "Error: Unsupported distribution '${OS_ID}'. Please install Python 3.11 manually." >&2
      exit 1
    fi
  else
    echo "Error: /etc/os-release not found. Please install Python 3.11 manually." >&2
    exit 1
  fi
fi

# Ensure graphics and OpenMP shared libraries exist
echo "Checking native C runtime libraries (libgomp, libGL, libglib)..."
if [ -f /etc/debian_version ]; then
  apt-get install -y -qq libgomp1 libgl1 libglib2.0-0 2>/dev/null || true
elif [ -f /etc/redhat-release ]; then
  dnf install -y -q mesa-libGL libgomp glib2 2>/dev/null || true
fi

# 4. Configure service user and group
echo "Configuring service user and group..."
if ! getent group "${SERVICE_GROUP}" &>/dev/null; then
  # Fallback to www-data if available
  if getent group "www-data" &>/dev/null; then
    SERVICE_GROUP="www-data"
  else
    groupadd -r "${SERVICE_GROUP}"
  fi
fi

if ! id "${SERVICE_USER}" &>/dev/null; then
  if id "www-data" &>/dev/null; then
    SERVICE_USER="www-data"
  else
    useradd -r -g "${SERVICE_GROUP}" -s /bin/false -d "${INSTALL_DIR}" "${SERVICE_USER}"
  fi
fi
echo "Using runtime user:group -> ${SERVICE_USER}:${SERVICE_GROUP}"

# 5. Initialize application directory and virtual environment
echo "Setting up application directory and virtual environment..."
mkdir -p "${INSTALL_DIR}/tmp"
chmod 750 "${INSTALL_DIR}/tmp"

if [ ! -d "${INSTALL_DIR}/venv" ]; then
  "${PYTHON_BIN}" -m venv "${INSTALL_DIR}/venv"
fi

"${INSTALL_DIR}/venv/bin/pip" install --upgrade pip setuptools wheel -q

# 6. Install dependencies
echo "Installing pinned dependencies from requirements.txt..."
"${INSTALL_DIR}/venv/bin/pip" install -r "${INSTALL_DIR}/requirements.txt"

# 7. Pre-cache and verify PP-OCRv4 models
echo "Pre-caching PP-OCRv4 models into local cache..."
"${INSTALL_DIR}/venv/bin/python" "${INSTALL_DIR}/scripts/download_models.py"

# 8. Set file ownership
chown -R "${SERVICE_USER}:${SERVICE_GROUP}" "${INSTALL_DIR}"

# 9. Configure systemd unit
if [ -f "${INSTALL_DIR}/deployment/careid-ocr.service" ]; then
  echo "Installing systemd service /etc/systemd/system/careid-ocr.service..."
  # Replace user/group in service file if running as www-data
  sed -i "s/^User=.*/User=${SERVICE_USER}/" "${INSTALL_DIR}/deployment/careid-ocr.service"
  sed -i "s/^Group=.*/Group=${SERVICE_GROUP}/" "${INSTALL_DIR}/deployment/careid-ocr.service"
  cp "${INSTALL_DIR}/deployment/careid-ocr.service" /etc/systemd/system/careid-ocr.service
  systemctl daemon-reload
fi

echo "=================================================================="
echo " CareID Standalone OCR Installation Completed Successfully!"
echo " Service User: ${SERVICE_USER}:${SERVICE_GROUP}"
echo " Interpreter:  ${INSTALL_DIR}/venv/bin/python"
echo "=================================================================="
