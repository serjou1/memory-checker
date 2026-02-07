#!/usr/bin/env bash
set -euo pipefail

# ===== CONFIG =====
SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/snapshotter/snapshot.sh"
CRON_SCHEDULE="0 2 * * *"
CRON_CMD="$CRON_SCHEDULE $SCRIPT_PATH"
# ==================

if [[ ! -x "$SCRIPT_PATH" ]]; then
  echo "❌ snapshot.sh not found or not executable:"
  echo "   $SCRIPT_PATH"
  exit 1
fi

echo "Installing cron job:"
echo "  $CRON_CMD"
echo

# Read current crontab (if any)
CRONTAB_TMP="$(mktemp)"
crontab -l 2>/dev/null | grep -v -F "$SCRIPT_PATH" > "$CRONTAB_TMP" || true

# Add our job
echo "$CRON_CMD" >> "$CRONTAB_TMP"

# Install new crontab
crontab "$CRONTAB_TMP"
rm -f "$CRONTAB_TMP"

# ===== VERIFY =====
echo "Verifying cron installation..."
if crontab -l | grep -F "$SCRIPT_PATH" >/dev/null; then
  echo "✅ Cron job successfully installed"
  crontab -l | grep -F "$SCRIPT_PATH"
else
  echo "❌ Failed to install cron job"
  exit 1
fi
