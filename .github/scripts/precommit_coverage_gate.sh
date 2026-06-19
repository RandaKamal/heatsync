#!/usr/bin/env bash
set -euo pipefail
export PYTEST_DISABLE_PLUGIN_AUTOLOAD=1

mapfile -t test_files < <(git ls-files \
  'backend/test_*.py' \
  'backend/*_test.py' \
  'backend/**/test_*.py' \
  'backend/**/*_test.py' \
  | sort -u)
if [ "${#test_files[@]}" -eq 0 ]; then
  echo "No backend tests found; skipping coverage gate."
  exit 0
fi

mkdir -p build/slow-lane
uv run --project backend coverage erase
uv run --project backend coverage run -m pytest "${test_files[@]}" -q
uv run --project backend coverage combine
uv run --project backend coverage json -o build/slow-lane/coverage.json
