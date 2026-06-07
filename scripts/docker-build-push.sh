#!/usr/bin/env bash
# ============================================================
# LitShowShare - Build & Push Docker image to Aliyun ACR
# ============================================================
# Usage:
#   bash scripts/docker-build-push.sh                   # use .env.docker
#   bash scripts/docker-build-push.sh --env .env.prod   # custom env file
#   bash scripts/docker-build-push.sh --tag v1.2.3      # override tag
#
# Required vars (from env file or shell env):
#   IMAGE_REGISTRY  IMAGE_NAMESPACE  IMAGE_NAME
#   ACR_USERNAME    ACR_PASSWORD
# ============================================================

set -euo pipefail

# ---------- Defaults ----------
ENV_FILE=".env.docker"
TAG_OVERRIDE=""

# ---------- Parse args ----------
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)  ENV_FILE="$2"; shift 2 ;;
    --tag)  TAG_OVERRIDE="$2"; shift 2 ;;
    -h|--help)
      grep '^#' "$0" | sed 's/^#//'
      exit 0 ;;
    *) echo "[ERROR] Unknown option: $1"; exit 1 ;;
  esac
done

# ---------- Load env file ----------
if [[ -f "$ENV_FILE" ]]; then
  echo "[INFO] Loading env file: $ENV_FILE"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
else
  echo "[WARN] Env file not found: $ENV_FILE (relying on shell env vars)"
fi

# ---------- Validate ----------
: "${IMAGE_REGISTRY:?IMAGE_REGISTRY is required}"
: "${IMAGE_NAMESPACE:?IMAGE_NAMESPACE is required}"
: "${IMAGE_NAME:?IMAGE_NAME is required}"
: "${ACR_USERNAME:?ACR_USERNAME is required}"
: "${ACR_PASSWORD:?ACR_PASSWORD is required}"

# ---------- Compute tags ----------
GIT_SHA="$(git rev-parse --short HEAD 2>/dev/null || echo "nogit")"
PRIMARY_TAG="${TAG_OVERRIDE:-${IMAGE_TAG:-latest}}"
IMAGE_FULL="${IMAGE_REGISTRY}/${IMAGE_NAMESPACE}/${IMAGE_NAME}"

echo "[INFO] Image:       ${IMAGE_FULL}"
echo "[INFO] Primary tag: ${PRIMARY_TAG}"
echo "[INFO] Git tag:     ${GIT_SHA}"

# ---------- Login ----------
echo "[INFO] Logging in to ${IMAGE_REGISTRY}..."
echo "${ACR_PASSWORD}" | docker login "${IMAGE_REGISTRY}" \
  --username "${ACR_USERNAME}" --password-stdin

# ---------- Build ----------
echo "[INFO] Building image..."
docker build \
  --pull \
  -t "${IMAGE_FULL}:${PRIMARY_TAG}" \
  -t "${IMAGE_FULL}:${GIT_SHA}" \
  .

# ---------- Push ----------
echo "[INFO] Pushing ${IMAGE_FULL}:${PRIMARY_TAG} ..."
docker push "${IMAGE_FULL}:${PRIMARY_TAG}"

echo "[INFO] Pushing ${IMAGE_FULL}:${GIT_SHA} ..."
docker push "${IMAGE_FULL}:${GIT_SHA}"

# ---------- Done ----------
cat <<EOF

============================================================
  Build & push complete.
============================================================
  Image: ${IMAGE_FULL}:${PRIMARY_TAG}
         ${IMAGE_FULL}:${GIT_SHA}

  Next step on your VPS:
    cd /opt/litshowshare
    docker compose pull
    docker compose up -d
============================================================
EOF
