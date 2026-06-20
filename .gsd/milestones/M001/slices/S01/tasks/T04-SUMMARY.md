---
id: T04
parent: S01
milestone: M001
key_files:
  - backend/pyproject.toml
  - backend/notebooks/utils.py
  - backend/notebooks/01_preprocessing.ipynb
  - backend/tests/test_utils.py
  - backend/data/processed/processed_heating.csv
  - backend/data/processed/processed_cooling.csv
key_decisions:
  - Preserve existing pytest root behavior while adding the repository root to pytest pythonpath so full-suite tests can import `backend.*` modules.
duration: 
verification_result: passed
completed_at: 2026-06-20T11:38:13.144Z
blocker_discovered: false
---

# T04: Verified the preprocessing utilities, tests, processed CSV artifacts, and notebook execution end-to-end, with backend pytest collection fixed for repository-root imports.

**Verified the preprocessing utilities, tests, processed CSV artifacts, and notebook execution end-to-end, with backend pytest collection fixed for repository-root imports.**

## What Happened

Ran the T04 quality gate suite against `backend/notebooks/utils.py`, the preprocessing notebook, processed CSV outputs, and the backend test suite. Ruff check, Ruff format check, mypy, Bandit, processed CSV schema validation, and notebook execution all passed.

The first full-suite pytest run failed during collection because existing tests import `backend.data.loader` while pytest rooted at `backend/`, leaving the repository root off `sys.path`. I made the smallest configuration-only fix in `backend/pyproject.toml` by adding `".."` before `"."` in `[tool.pytest.ini_options].pythonpath`, preserving existing `app` imports while allowing `backend.*` package imports. The full backend test suite then passed with 29 tests.

## Failure Modes
- Filesystem/data dependency: `utils.py` reads CSV data from `backend/data/`; missing files or malformed required columns bubble as explicit exceptions covered by utility tests, while absent optional snapshot columns emit warnings visible during notebook execution.
- Subprocess/tool dependency: quality gates depend on the backend uv environment and fail fast through non-zero exits; `uv sync --project backend --frozen --dev` succeeded before gates ran.
- Notebook execution dependency: `nbconvert.ExecutePreprocessor` executes the notebook in the notebook directory and surfaces execution failures as a non-zero verification result. A dashboard-marker assertion initially used labels that were more literal than the notebook output; the notebook output was inspected and the final check asserts the actual dashboard labels required by the slice contract.

## Load Profile
- Runtime load dimension is local pandas CSV preprocessing and notebook execution over the checked-in heating/cooling windows. At 10x data volume, memory during pandas DataFrame loading/resampling would saturate first because the utilities operate in-memory rather than streaming.
- Current protection is scope-bound caching to `backend/data/processed/` and deterministic 15-minute aggregation for the teaching dataset; no service concurrency, network fanout, pool sizing, or rate limiting applies to this offline slice.

## Negative Tests
- `backend/tests/test_utils.py` covers negative and boundary paths for missing input files, missing required CSV columns, invalid alignment timestamp columns, invalid processed-cache paths, interpolation metadata, occupancy flag boundaries, and feature-engineering prerequisites.
- Existing backend tests also verify loader/API behavior after the pytest path fix, ensuring the new preprocessing work did not regress the broader backend suite.

## Verification

Verified with backend uv tooling. Final composite verification ran Ruff check over `backend/notebooks`, Ruff format check over `backend/notebooks`, mypy on `backend/notebooks/utils.py`, Bandit on `backend/notebooks/utils.py`, full `pytest backend/tests/ -v`, processed CSV existence/schema checks for both naming conventions, and in-memory execution of `backend/notebooks/01_preprocessing.ipynb` with dashboard output markers for shapes, date ranges, missing values, duplicate checks, engineered sample rows, interpolation totals, and heating/cooling summaries. All final checks exited 0.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv sync --project backend --frozen --dev` | 0 | ✅ pass | 7318ms |
| 2 | `uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py` | 0 | ✅ pass | 124ms |
| 3 | `uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py` | 0 | ✅ pass | 137ms |
| 4 | `uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py` | 0 | ✅ pass | 2733ms |
| 5 | `uv run --project backend bandit -q backend/notebooks/utils.py` | 0 | ✅ pass | 838ms |
| 6 | `uv run --project backend pytest backend/tests/ -v` | 0 | ✅ pass | 4817ms |
| 7 | `uv run --project backend python processed CSV schema check` | 0 | ✅ pass | 534ms |
| 8 | `final T04 gates: ruff check notebooks && ruff format notebooks && mypy utils && bandit utils && full pytest && processed schema && notebook execution dashboard` | 0 | ✅ pass | 9920ms |

## Deviations

Added `..` to backend pytest `pythonpath` so the existing full-suite command can import both `backend.*` modules and existing top-level `app` imports from the backend project root.

## Known Issues

Notebook execution emits expected warnings for optional snapshot columns absent from the raw heating CSV; these are surfaced as warnings rather than failures because the columns are optional in the data contract.

## Files Created/Modified

- `backend/pyproject.toml`
- `backend/notebooks/utils.py`
- `backend/notebooks/01_preprocessing.ipynb`
- `backend/tests/test_utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/processed_cooling.csv`
