#!/usr/bin/env sh
set -eu

# Directory of this script / project root
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname "$0")" && pwd)

CRON_MARKER="memory-checker-disk-alert"
LOG_FILE="$SCRIPT_DIR/cron.log"

CRON_CMD="*/5 * * * * cd $SCRIPT_DIR && /usr/bin/env PATH=\"$PATH\" node index.js >> $LOG_FILE 2>&1 # $CRON_MARKER"

# Preserve existing crontab entries that are not ours, then append/update ours.
# Using grep to remove any previous entries with the marker ensures idempotency.
{
  crontab -l 2>/dev/null | grep -v "$CRON_MARKER" || true
  echo "$CRON_CMD"
} | crontab -

echo "Cron job installed to run every 5 minutes. Logs: $LOG_FILE"
