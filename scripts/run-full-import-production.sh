#!/usr/bin/env bash
# Same resumable driver as run-full-import.sh, pointed at production via
# --env=.env.production.local, with its own manifest/log so it never
# collides with the completed local-dev run's manifest.
set -uo pipefail

CORPUS_ROOT="$1"
LOG_FILE="${2:-./scripts/full-import.production.log}"
MANIFEST="${3:-./scripts/full-import.production.manifest}"
ENV_FILE="${4:-.env.production.local}"

if [ -z "$CORPUS_ROOT" ]; then
  echo 'Usage: run-full-import-production.sh "<corpus root>" [log file] [manifest file] [env file]'
  exit 1
fi

touch "$MANIFEST"

for term_dir in "$CORPUS_ROOT"/TERM\ [123]; do
  [ -d "$term_dir" ] || continue
  term_num=$(basename "$term_dir" | grep -o '[123]')
  for class_dir in "$term_dir"/*/; do
    [ -d "$class_dir" ] || continue
    class_name=$(basename "$class_dir")
    key="$term_num|$class_name"
    if grep -qxF "$key" "$MANIFEST"; then
      echo "=== Term $term_num / $class_name (already done, skipping) ===" | tee -a "$LOG_FILE"
      continue
    fi
    echo "=== Term $term_num / $class_name ===" | tee -a "$LOG_FILE"
    node scripts/import-lesson-plan-library.mjs "$CORPUS_ROOT" "--term=$term_num" "--class=$class_name" "--env=$ENV_FILE" >> "$LOG_FILE" 2>&1
    status=$?
    if [ $status -eq 0 ]; then
      echo "$key" >> "$MANIFEST"
    else
      echo "!!! FAILED (exit $status): Term $term_num / $class_name — will retry on next run" | tee -a "$LOG_FILE"
    fi
    sleep 5
  done
done

echo "=== All groups processed ===" | tee -a "$LOG_FILE"
