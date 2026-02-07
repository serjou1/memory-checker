#!/usr/bin/env bash
set -euo pipefail

SNAPSHOT_DIR="/var/lib/fs-snapshots"

DAYS=""
while getopts "d:" opt; do
  case $opt in
    d) DAYS="$OPTARG" ;;
    *) echo "Usage: $0 -d DAYS"; exit 1 ;;
  esac
done

if [[ -z "$DAYS" ]]; then
  echo "Usage: $0 -d DAYS"
  exit 1
fi

NEW_DATE=$(date +%F)
OLD_DATE=$(date -d "$DAYS days ago" +%F)

NEW_FILE="$SNAPSHOT_DIR/snapshot-$NEW_DATE.txt"
OLD_FILE="$SNAPSHOT_DIR/snapshot-$OLD_DATE.txt"

if [[ ! -f "$NEW_FILE" || ! -f "$OLD_FILE" ]]; then
  echo "Snapshot missing:"
  [[ ! -f "$OLD_FILE" ]] && echo "  ❌ $OLD_FILE"
  [[ ! -f "$NEW_FILE" ]] && echo "  ❌ $NEW_FILE"
  exit 1
fi

echo "Analyzing growth from $OLD_DATE → $NEW_DATE"
echo

join -1 2 -2 2 \
  <(awk '{print $2, $1}' "$OLD_FILE" | sort) \
  <(awk '{print $2, $1}' "$NEW_FILE" | sort) \
  | awk '{
      diff = $3 - $2
      if (diff > 0)
        printf "%12d  %s\n", diff, $1
    }' \
  | sort -nr \
  | head -30 \
  | awk '{ printf "%10.2f GB  %s\n", $1/1024/1024/1024, $2 }'
