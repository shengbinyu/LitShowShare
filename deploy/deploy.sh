#!/usr/bin/env bash
# ============================================================
# LitShowShare - One-click VPS Deployment Script
# ============================================================
# Usage:
#   sudo bash deploy.sh                    # Deploy from local source
#   sudo bash deploy.sh --repo <git-url>   # Deploy from Git repository
#   sudo bash deploy.sh --update           # Update existing deployment
# ============================================================

set -euo pipefail

# ----- Configuration -----
INSTALL_DIR="/opt/litshowshare"
SERVICE_NAME="litshowshare"
NODE_VERSION="20"
PORT="${LITSHOWSHARE_PORT:-3001}"
HOST="${LITSHOWSHARE_HOST:-127.0.0.1}"

# ----- Color output -----
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${GREEN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

# ----- Pre-flight checks -----
[[ $EUID -ne 0 ]] && error "This script must be run as root (use sudo)"

# ----- Parse arguments -----
GIT_REPO=""
IS_UPDATE=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --repo)   GIT_REPO="$2"; shift 2 ;;
    --update) IS_UPDATE=true; shift ;;
    -h|--help)
      echo "Usage: sudo bash deploy.sh [--repo <git-url>] [--update]"
      exit 0 ;;
    *) error "Unknown option: $1" ;;
  esac
done

# ============================================================
# Step 1: Install system dependencies
# ============================================================
install_dependencies() {
  info "Installing system dependencies..."

  if command -v apt-get &>/dev/null; then
    apt-get update -qq
    apt-get install -y -qq curl git nginx build-essential python3
  elif command -v yum &>/dev/null; then
    yum install -y -q curl git nginx gcc-c++ make python3
  elif command -v dnf &>/dev/null; then
    dnf install -y -q curl git nginx gcc-c++ make python3
  else
    error "Unsupported package manager. Please install Node.js 20+, Nginx, and git manually."
  fi

  info "System dependencies installed."
}

# ============================================================
# Step 2: Install Node.js
# ============================================================
install_node() {
  if command -v node &>/dev/null && [[ "$(node -v | cut -d. -f1)" == "v${NODE_VERSION}" ]]; then
    info "Node.js ${NODE_VERSION} already installed."
    return
  fi

  info "Installing Node.js ${NODE_VERSION}..."
  curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | bash -
  if command -v apt-get &>/dev/null; then
    apt-get install -y -qq nodejs
  elif command -v yum &>/dev/null; then
    yum install -y -q nodejs
  elif command -v dnf &>/dev/null; then
    dnf install -y -q nodejs
  fi

  node --version
  npm --version
  info "Node.js installed."
}

# ============================================================
# Step 3: Get source code
# ============================================================
get_source() {
  if [[ -n "${GIT_REPO}" ]]; then
    info "Cloning from ${GIT_REPO}..."
    if [[ -d "${INSTALL_DIR}/.git" ]]; then
      cd "${INSTALL_DIR}"
      git pull --ff-only
    else
      rm -rf "${INSTALL_DIR}"
      git clone "${GIT_REPO}" "${INSTALL_DIR}"
    fi
  elif [[ -d "${INSTALL_DIR}" && "${IS_UPDATE}" == true ]]; then
    info "Updating existing deployment at ${INSTALL_DIR}..."
    if [[ -d "${INSTALL_DIR}/.git" ]]; then
      cd "${INSTALL_DIR}"
      git pull --ff-only || warn "Git pull failed, using existing source"
    fi
  else
    # Deploy from current directory (script location)
    SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    SOURCE_DIR="$(dirname "${SCRIPT_DIR}")"

    if [[ ! -f "${SOURCE_DIR}/package.json" ]]; then
      error "Cannot find project source. Use --repo to specify a Git URL."
    fi

    info "Copying source from ${SOURCE_DIR}..."
    mkdir -p "${INSTALL_DIR}"
    rsync -a --exclude='node_modules' --exclude='.git' --exclude='dist' \
      --exclude='backend/data' --exclude='backend/uploads' \
      "${SOURCE_DIR}/" "${INSTALL_DIR}/"
  fi

  info "Source code ready at ${INSTALL_DIR}."
}

# ============================================================
# Step 4: Build frontend & install backend dependencies
# ============================================================
build_project() {
  cd "${INSTALL_DIR}"

  # Build frontend
  info "Installing frontend dependencies..."
  npm ci --production=false

  info "Building frontend..."
  npm run build

  # Install backend dependencies
  info "Installing backend dependencies..."
  cd "${INSTALL_DIR}/backend"
  npm ci --production=false

  info "Build complete."
}

# ============================================================
# Step 5: Preserve data (database & uploads)
# ============================================================
preserve_data() {
  cd "${INSTALL_DIR}"

  # Ensure data and uploads directories exist
  mkdir -p backend/data backend/uploads

  # Set ownership so the service user can read/write
  chown -R www-data:www-data backend/data backend/uploads

  info "Data directories ready."
}

# ============================================================
# Step 6: Configure systemd service
# ============================================================
setup_service() {
  info "Configuring systemd service..."

  # Write the service file with current configuration
  cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=LitShowShare Backend Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${INSTALL_DIR}
ExecStart=$(command -v node) ${INSTALL_DIR}/backend/node_modules/.bin/tsx ${INSTALL_DIR}/backend/src/index.ts
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=${PORT}
Environment=HOST=${HOST}

[Install]
WantedBy=multi-user.target
EOF

  systemctl daemon-reload
  systemctl enable ${SERVICE_NAME}
  systemctl restart ${SERVICE_NAME}

  info "Service ${SERVICE_NAME} started and enabled."
}

# ============================================================
# Step 7: Configure Nginx reverse proxy
# ============================================================
setup_nginx() {
  info "Configuring Nginx..."

  NGINX_CONF="/etc/nginx/sites-available/${SERVICE_NAME}"
  NGINX_LINK="/etc/nginx/sites-enabled/${SERVICE_NAME}"

  cat > "${NGINX_CONF}" << EOF
server {
    listen 80;
    server_name _;

    client_max_body_size 50m;

    location / {
        proxy_pass http://${HOST}:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  # Enable the site
  ln -sf "${NGINX_CONF}" "${NGINX_LINK}"

  # Remove default site if it exists
  rm -f /etc/nginx/sites-enabled/default

  # Test and reload Nginx
  nginx -t && systemctl reload nginx || error "Nginx configuration test failed"

  info "Nginx configured."
}

# ============================================================
# Step 8: Configure firewall
# ============================================================
setup_firewall() {
  if command -v ufw &>/dev/null; then
    info "Configuring UFW firewall..."
    ufw allow 'Nginx Full'
    ufw --force enable
    info "Firewall configured."
  elif command -v firewall-cmd &>/dev/null; then
    info "Configuring firewalld..."
    firewall-cmd --permanent --add-service=http
    firewall-cmd --permanent --add-service=https
    firewall-cmd --reload
    info "Firewall configured."
  else
    warn "No firewall detected. Make sure port 80 is open."
  fi
}

# ============================================================
# Main
# ============================================================
main() {
  echo ""
  echo "========================================="
  echo "  LitShowShare - VPS Deployment"
  echo "========================================="
  echo ""

  install_dependencies
  install_node
  get_source
  build_project
  preserve_data
  setup_service
  setup_nginx
  setup_firewall

  echo ""
  echo "========================================="
  echo "  Deployment Complete!"
  echo "========================================="
  echo ""
  info "Application is running at: http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo 'YOUR_SERVER_IP')"
  echo ""
  echo "Useful commands:"
  echo "  sudo systemctl status ${SERVICE_NAME}   # Check service status"
  echo "  sudo systemctl restart ${SERVICE_NAME}  # Restart service"
  echo "  sudo journalctl -u ${SERVICE_NAME} -f   # View live logs"
  echo "  sudo bash ${INSTALL_DIR}/deploy/deploy.sh --update  # Update deployment"
  echo ""
}

main
