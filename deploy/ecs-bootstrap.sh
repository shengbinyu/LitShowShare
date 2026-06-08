#!/usr/bin/env bash
# ============================================================
# LitShowShare - Aliyun ECS One-Time Bootstrap
# ------------------------------------------------------------
# Prepare an Aliyun ECS host so that GitHub Actions can deploy
# the litshowshare container via SSH.
#
# What this script does:
#   1. Install Docker CE + docker compose plugin (Aliyun mirror)
#   2. Configure Docker daemon registry mirror for faster pulls
#   3. Create /opt/litshowshare/{data,uploads}
#   4. Drop in docker-compose.yml and .env (from template)
#   5. Open firewall port for the app
#
# Usage:
#   sudo bash ecs-bootstrap.sh
#   sudo bash ecs-bootstrap.sh --repo https://github.com/<user>/LitShowShare.git
# ============================================================

set -euo pipefail

# ----- Configuration -----
APP_DIR="/opt/litshowshare"
DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_UID=1000
DEPLOY_GID=1000
HOST_PORT="${LITSHOWSHARE_HOST_PORT:-3001}"

# Optional: clone repo to copy compose/env files. If empty, the script
# expects the repo to already be present (e.g. uploaded manually) at /tmp/litshowshare-src
GIT_REPO=""

# ----- Color output -----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && error "This script must be run as root (use sudo)"

# ----- Parse arguments -----
while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo) GIT_REPO="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: sudo bash ecs-bootstrap.sh [--repo <git-url>]"
      exit 0 ;;
    *) error "Unknown option: $1" ;;
  esac
done

# ============================================================
# Step 1: Install Docker CE + compose plugin
# ============================================================
install_docker() {
  if command -v docker &>/dev/null && docker compose version &>/dev/null; then
    info "Docker and compose plugin already installed."
    return
  fi

  info "Installing Docker CE via Aliyun mirror..."

  if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq ca-certificates curl gnupg

    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://mirrors.aliyun.com/docker-ce/linux/ubuntu/gpg \
      | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    . /etc/os-release
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
       https://mirrors.aliyun.com/docker-ce/linux/ubuntu ${VERSION_CODENAME} stable" \
      | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

  elif command -v dnf &>/dev/null || command -v yum &>/dev/null; then
    PKG=$(command -v dnf || command -v yum)
    $PKG install -y -q yum-utils
    $PKG config-manager --add-repo https://mirrors.aliyun.com/docker-ce/linux/centos/docker-ce.repo
    $PKG install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  else
    error "Unsupported OS. Install Docker manually then re-run."
  fi

  systemctl enable --now docker
  info "Docker installed: $(docker --version)"
}

# ============================================================
# Step 2: Configure Docker daemon registry mirrors
# ============================================================
configure_docker_mirror() {
  info "Configuring Docker registry mirrors..."
  mkdir -p /etc/docker
  cat > /etc/docker/daemon.json <<'EOF'
{
  "registry-mirrors": [
    "https://docker.m.daocloud.io",
    "https://dockerproxy.com",
    "https://mirror.baidubce.com"
  ],
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  systemctl restart docker
  info "Docker daemon reloaded with registry mirrors."
}

# ============================================================
# Step 3: Prepare a non-root deploy user (GitHub Actions SSH login)
# ============================================================
prepare_deploy_user() {
  if id "${DEPLOY_USER}" &>/dev/null; then
    info "User ${DEPLOY_USER} already exists."
  else
    info "Creating user ${DEPLOY_USER} (uid/gid ${DEPLOY_UID}:${DEPLOY_GID})..."
    # Create group with fixed gid (ignore if gid already taken)
    groupadd -g "${DEPLOY_GID}" "${DEPLOY_USER}" 2>/dev/null \
      || groupadd "${DEPLOY_USER}" 2>/dev/null || true
    # Create user. Fall back to auto-assigned uid if 1000 is taken
    useradd -m -s /bin/bash -u "${DEPLOY_UID}" -g "${DEPLOY_USER}" "${DEPLOY_USER}" 2>/dev/null \
      || useradd -m -s /bin/bash -g "${DEPLOY_USER}" "${DEPLOY_USER}"
    # Lock password login -> SSH key only
    passwd -l "${DEPLOY_USER}" >/dev/null
  fi

  # Allow deploy user to run docker without sudo
  usermod -aG docker "${DEPLOY_USER}"

  # Prepare ~/.ssh and authorized_keys with strict perms
  local ssh_dir="/home/${DEPLOY_USER}/.ssh"
  install -d -m 700 -o "${DEPLOY_USER}" -g "${DEPLOY_USER}" "${ssh_dir}"
  touch "${ssh_dir}/authorized_keys"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${ssh_dir}/authorized_keys"
  chmod 600 "${ssh_dir}/authorized_keys"

  info "Deploy user ready: ${DEPLOY_USER} (docker group: $(id -nG ${DEPLOY_USER} | tr ' ' ','))"
}

# ============================================================
# Step 4: Prepare /opt/litshowshare directory
# ============================================================
prepare_app_dir() {
  info "Preparing ${APP_DIR}..."
  mkdir -p "${APP_DIR}/data" "${APP_DIR}/uploads"
  # Give the whole app directory to the deploy user so CI can write without sudo
  chown -R "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}"
  chmod 750 "${APP_DIR}"
}

# ============================================================
# Step 5: Drop in docker-compose.yml and .env
# ============================================================
fetch_compose_files() {
  local src_dir=""

  if [[ -n "${GIT_REPO}" ]]; then
    info "Cloning ${GIT_REPO} to /tmp/litshowshare-src ..."
    rm -rf /tmp/litshowshare-src
    git clone --depth 1 "${GIT_REPO}" /tmp/litshowshare-src
    src_dir=/tmp/litshowshare-src
  elif [[ -d /tmp/litshowshare-src ]]; then
    src_dir=/tmp/litshowshare-src
  else
    warn "No repo provided. You must place docker-compose.yml and .env.docker.example into ${APP_DIR} manually."
    return
  fi

  cp -f "${src_dir}/docker-compose.yml" "${APP_DIR}/docker-compose.yml"
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/docker-compose.yml"

  if [[ ! -f "${APP_DIR}/.env" ]]; then
    cp "${src_dir}/.env.docker.example" "${APP_DIR}/.env"
    # Generate a strong JWT secret if user hasn't filled one
    JWT_RAND=$(head -c 48 /dev/urandom | base64 | tr -d '\n/+=')
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=${JWT_RAND}|" "${APP_DIR}/.env"
    warn "Created ${APP_DIR}/.env. Please review and set IMAGE_NAMESPACE / IMAGE_NAME."
  else
    info "${APP_DIR}/.env already exists; keep as-is."
  fi
  # Tighten .env perms (contains JWT_SECRET) and hand it to deploy user
  chown "${DEPLOY_USER}:${DEPLOY_USER}" "${APP_DIR}/.env"
  chmod 600 "${APP_DIR}/.env"
}

# ============================================================
# Step 6: Open firewall
# ============================================================
configure_firewall() {
  if command -v ufw &>/dev/null && ufw status | grep -q "Status: active"; then
    info "Opening port ${HOST_PORT} via ufw..."
    ufw allow "${HOST_PORT}/tcp"
  elif command -v firewall-cmd &>/dev/null && systemctl is-active --quiet firewalld; then
    info "Opening port ${HOST_PORT} via firewalld..."
    firewall-cmd --permanent --add-port="${HOST_PORT}/tcp"
    firewall-cmd --reload
  else
    warn "No active host firewall detected. Don't forget to open port ${HOST_PORT} in Aliyun ECS Security Group."
  fi
}

# ============================================================
# Main
# ============================================================
main() {
  echo ""
  echo "========================================="
  echo "  LitShowShare - ECS Bootstrap"
  echo "========================================="
  echo ""

  install_docker
  configure_docker_mirror
  prepare_deploy_user
  prepare_app_dir
  fetch_compose_files
  configure_firewall

  echo ""
  echo "========================================="
  echo "  Bootstrap Complete"
  echo "========================================="
  echo ""
  info "Next steps:"
  echo "  1. Edit ${APP_DIR}/.env -> set IMAGE_REGISTRY / IMAGE_NAMESPACE / IMAGE_NAME"
  echo "  2. Generate a CI-only SSH key as the deploy user:"
  echo "       sudo -u ${DEPLOY_USER} ssh-keygen -t ed25519 -N '' -C github-actions \\"
  echo "         -f /home/${DEPLOY_USER}/.ssh/gha_deploy"
  echo "       sudo -u ${DEPLOY_USER} sh -c 'cat /home/${DEPLOY_USER}/.ssh/gha_deploy.pub \\"
  echo "         >> /home/${DEPLOY_USER}/.ssh/authorized_keys'"
  echo "       sudo cat /home/${DEPLOY_USER}/.ssh/gha_deploy   # paste into GitHub Secret ECS_SSH_KEY"
  echo "  3. Add GitHub repository secrets:"
  echo "       ECS_HOST    = <ECS public IP or domain>"
  echo "       ECS_USER    = ${DEPLOY_USER}"
  echo "       ECS_SSH_KEY = <the private key printed above>"
  echo "       ECS_PORT    = 22  (optional)"
  echo "  4. Push to main (or trigger workflow_dispatch) -> GitHub Actions will pull & deploy"
  echo ""
  echo "Manual smoke test (run as ${DEPLOY_USER}):"
  echo "  sudo -iu ${DEPLOY_USER} bash -c 'cd ${APP_DIR} && docker compose pull && docker compose up -d'"
  echo ""
}

main
