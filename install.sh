#!/usr/bin/env bash
set -euo pipefail

# ================================================
#  DORA AGENT — One-Line Linux VPS Installer
#  Verifies SHA-256, isolates user data, sets up systemd
# ================================================

INSTALL_ROOT="/opt/dora-agent"
CORE_DIR="${INSTALL_ROOT}/core"
USERDATA_DIR="${INSTALL_ROOT}/userdata"
SERVICE_USER="dora"
RELEASE_BASE="https://github.com/CodeCraftersTeam01/DORA-AGENT/releases/latest/download"
BUNDLE_FILE="dora-agent-core.tar.gz"
CHECKSUM_FILE="dora-agent-core.tar.gz.sha256"

if [[ "${EUID}" -ne 0 ]]; then
  echo "❌ Jalankan installer ini dengan sudo/root: curl -fsSL ... | sudo bash"
  exit 1
fi

echo "🚀 Memulai instalasi DORA Agent Server..."

# 1. Cek / Install Node.js >= 20
NEED_NODE=1
if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -v | sed 's/^v//' | cut -d. -f1)"
  if [[ "${NODE_MAJOR}" -ge 20 ]]; then
    NEED_NODE=0
    echo "✅ Node.js $(node -v) sudah terpasang."
  fi
fi

if [[ "${NEED_NODE}" -eq 1 ]]; then
  echo "📦 Menginstal Node.js 20 LTS..."
  if command -v apt-get >/dev/null 2>&1; then
    apt-get update -y
    apt-get install -y ca-certificates curl gnupg tar
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  elif command -v dnf >/dev/null 2>&1; then
    dnf install -y curl tar
    curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
    dnf install -y nodejs
  else
    echo "❌ Package manager tidak dikenali. Harap install Node.js >= 20 secara manual."
    exit 1
  fi
fi

# 2. Buat user non-root khusus service
if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "${SERVICE_USER}"
fi

mkdir -p "${INSTALL_ROOT}" "${USERDATA_DIR}"

# 3. Unduh bundle core + verifikasi SHA-256
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "${TMP_DIR}"' EXIT

echo "⬇️  Mengunduh DORA Agent Core dari GitHub Releases..."
curl -fsSL "${RELEASE_BASE}/${BUNDLE_FILE}" -o "${TMP_DIR}/${BUNDLE_FILE}"
curl -fsSL "${RELEASE_BASE}/${CHECKSUM_FILE}" -o "${TMP_DIR}/${CHECKSUM_FILE}"

echo "🔐 Memverifikasi checksum SHA-256..."
(cd "${TMP_DIR}" && sha256sum -c "${CHECKSUM_FILE}")

# 4. Ekstrak secara atomik ke staging lalu swap ke /opt/dora-agent/core
STAGING_DIR="${INSTALL_ROOT}/core_staging"
rm -rf "${STAGING_DIR}"
mkdir -p "${STAGING_DIR}"
tar --no-same-owner -xzf "${TMP_DIR}/${BUNDLE_FILE}" -C "${STAGING_DIR}"

if [[ -d "${CORE_DIR}/node_modules" ]]; then
  mv "${CORE_DIR}/node_modules" "${STAGING_DIR}/node_modules"
fi

rm -rf "${CORE_DIR}"
mv "${STAGING_DIR}" "${CORE_DIR}"

echo "📦 Menginstal dependensi production..."
cd "${CORE_DIR}"
npm install --omit=dev --legacy-peer-deps --no-audit --no-fund

chown -R "${SERVICE_USER}:${SERVICE_USER}" "${INSTALL_ROOT}"

# 5. Pasang systemd service
if [[ -f "${CORE_DIR}/dora-agent.service" ]]; then
  cp "${CORE_DIR}/dora-agent.service" /etc/systemd/system/dora-agent.service
  systemctl daemon-reload
  systemctl enable --now dora-agent.service
  echo "✅ Service dora-agent aktif!"
  echo "   • Cek status : sudo systemctl status dora-agent"
  echo "   • Lihat log  : sudo journalctl -u dora-agent -f"
  echo "   • Dashboard  : http://127.0.0.1:3000 (gunakan Nginx/Caddy HTTPS untuk akses publik)"
else
  echo "⚠️  dora-agent.service tidak ditemukan; jalankan manual: DORA_DATA_ROOT=${USERDATA_DIR} node ${CORE_DIR}/index.js"
fi
