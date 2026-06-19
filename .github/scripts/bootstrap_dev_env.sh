#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

cd "$ROOT_DIR"
if ! command -v uv >/dev/null 2>&1; then
  echo "uv is required for HeatSync backend tooling. Install uv, then rerun this script." >&2
  exit 1
fi

uv sync --project backend --frozen --dev

if git ls-files 'backend/**/*.feature' | grep -q .; then
  "$ROOT_DIR/.github/scripts/install_aps_tools.sh"
else
  echo "No backend .feature files found; skipping APS tool installation."
fi
