#!/bin/sh
# ============================================================
# LitShowShare - container entrypoint
# Purpose:
#   1. Honor PUID/PGID env vars so the in-container "node" user
#      matches the host bind-mount owner (default 1000:1000).
#   2. Fix ownership of persistent dirs (data, uploads) on each
#      start, avoiding SQLITE_CANTOPEN on fresh hosts.
#   3. Drop privileges from root to node before exec-ing the app.
# ============================================================
set -e

PUID="${PUID:-1000}"
PGID="${PGID:-1000}"

# Only root can change uid/gid and chown the bind-mounts.
if [ "$(id -u)" = "0" ]; then
  current_uid="$(id -u node)"
  current_gid="$(id -g node)"

  if [ "$current_gid" != "$PGID" ]; then
    echo "[entrypoint] Updating group 'node' gid: $current_gid -> $PGID"
    groupmod -o -g "$PGID" node
  fi

  if [ "$current_uid" != "$PUID" ]; then
    echo "[entrypoint] Updating user 'node' uid: $current_uid -> $PUID"
    usermod -o -u "$PUID" node
  fi

  # Ensure persistent dirs exist and are owned by the node user.
  mkdir -p /app/backend/data /app/backend/uploads
  chown -R "$PUID:$PGID" /app/backend/data /app/backend/uploads

  echo "[entrypoint] Starting app as uid=$PUID gid=$PGID"
  # Re-exec self as node, then tini will become PID 1 of the new process tree.
  exec /usr/bin/tini -- su-exec node "$@"
fi

# Already non-root (e.g. user override via docker run --user) -> just exec.
exec /usr/bin/tini -- "$@"
