#!/usr/bin/env bash
set -euo pipefail

# ===== CONFIG =====
SNAPSHOT_DIR="/var/lib/fs-snapshots"
TARGET="/"
EXCLUDES=(
  "/proc"
  "/sys"
  "/dev"
  "/run"
  "/tmp"
  "/var/lib/fs-snapshots"
)
# ==================

DATE=$(date +%F)
OUT="$SNAPSHOT_DIR/snapshot-$DATE.txt"

mkdir -p "$SNAPSHOT_DIR"

EXCLUDE_ARGS=()
for e in "${EXCLUDES[@]}"; do
  EXCLUDE_ARGS+=(--exclude="$e")
done

echo "Creating snapshot for $DATE..."
du -x -B1 "${EXCLUDE_ARGS[@]}" "$TARGET" \
  | sort -n \
  > "$OUT"

echo "Snapshot saved: $OUT"
