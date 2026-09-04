#!/usr/bin/env bash
# Drives scripts/import-lesson-plan-library.mjs one class/term folder at a
# time, each as its own short-lived node process. The single-process
# whole-corpus run OOM'd on this machine (host-level memory pressure, not
# a leak in the import script itself — likely Docker Desktop running the
# whole local Supabase stack alongside everything else on the box) even
# after cutting per-file memory use (mammoth's embedded images).
#
# Resumable: completed groups are recorded in a manifest file (one
# "term|class" per line) and skipped on the next invocation, so this can
# simply be re-run after a kill until the manifest covers every group —
# no need to track or guess how far a killed run got.
set -uo pipefail

CORPUS_ROOT="$1"
LOG_FILE="${2:-./scripts/full-import.log}"
MANIFEST="${3:-./scripts/full-import.manifest}"

if [ -z "$CORPUS_ROOT" ]; then
  echo 'Usage: run-full-import.sh "<corpus root>" [log file] [manifest file]'
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
    node scripts/import-lesson-plan-library.mjs "$CORPUS_ROOT" "--term=$term_num" "--class=$class_name" >> "$LOG_FILE" 2>&1
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
