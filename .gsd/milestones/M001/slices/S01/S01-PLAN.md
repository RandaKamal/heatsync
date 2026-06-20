# S01: Data Preprocessing and Shared Utilities

**Goal:** Deliver backend/notebooks/utils.py with shared CSV loading, 15-minute alignment, interpolation tracking, and feature engineering helpers, plus backend/notebooks/01_preprocessing.ipynb as a teaching walkthrough that produces cached processed DataFrames under backend/data/processed/.
**Demo:** Reads raw CSVs from backend/data/ and outputs normalized 15-min aligned dataframes via utils.py; 01_preprocessing.ipynb renders clean output cells.

## Must-Haves

- `backend/notebooks/utils.py` loads all 4 CSV types from both heating and cooling windows.\n- 15-minute alignment correctly downsamples snapshots and power_draw; intervals pass through aligned.\n- Interpolation/fill counts are tracked and surfaced per column.\n- Time features (hour_of_day, day_of_week, is_weekend) and weather features (outside_temperature) are engineered.\n- Space events are converted to occupancy flags on the 15-minute grid.\n- Missing required files or columns raise explicit errors; recoverable issues produce warnings with counts.\n- `01_preprocessing.ipynb` executes end-to-end programmatically via nbconvert with zero exceptions.\n- Processed DataFrames are saved under `backend/data/processed/` as CSV files.\n- `uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py` passes.\n- `uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py` passes.\n- Unit tests for utils.py pass via pytest.

## Proof Level

- This slice proves: automated — notebook execution via nbconvert, pytest unit tests for utils.py, ruff/mypy quality gates

## Integration Closure

S01 produces backend/notebooks/utils.py consumed by all downstream notebooks S02–S06. Cached processed DataFrames under backend/data/processed/ provide the common input artifact. The 15-minute aligned schema (timestamps, sensor columns, engineered features, quality flags) is the integration contract.

## Verification

- Notebook output cells display: raw vs aligned row counts per window, date ranges, missing interval counts, interpolation counts per column, and sample data tables. These serve as the data-quality dashboard for downstream slices.

## Tasks

- [x] **T01: Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.** `est:2–3 hours`
  **Why:** Every downstream notebook (S02–S06) needs consistent CSV loading, 15-minute clock alignment, interpolation tracking, and feature engineering. Centralizing this in utils.py prevents duplication and ensures all slices work from the same preprocessed data.
  - Files: `backend/notebooks/utils.py`, `backend/notebooks/__init__.py`, `backend/data/processed/.gitkeep`
  - Verify: uv run --project backend python -c "import notebooks.utils; print('import ok')" && uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py

- [x] **T02: Implemented comprehensive pytest coverage for preprocessing utilities in test_utils.py.** `est:1–2 hours`
  **Why:** utils.py is the shared foundation for 6 downstream notebooks. Automated tests catch regressions early and prove the alignment, feature engineering, and error handling contracts.
  - Files: `backend/tests/test_utils.py`
  - Verify: uv run --project backend pytest backend/tests/test_utils.py -v && uv run --project backend ruff check --config backend/pyproject.toml backend/tests/test_utils.py

- [x] **T03: Created 01_preprocessing.ipynb teaching walkthrough notebook and cached processed heating/cooling datasets.** `est:2–3 hours`
  **Why:** The preprocessing notebook is the primary deliverable users interact with. It must demonstrate the full raw-to-aligned pipeline as a readable walkthrough and cache processed artifacts for downstream notebooks.
  - Files: `backend/notebooks/01_preprocessing.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --ExecutePreprocessor.timeout=120 --output /tmp/test_01_output.ipynb

- [x] **T04: Verified the preprocessing utilities, tests, processed CSV artifacts, and notebook execution end-to-end, with backend pytest collection fixed for repository-root imports.** `est:30 min–1 hour`
  **Why:** Final verification ensures all artifacts pass project quality gates (ruff, mypy, bandit) and the full pipeline works end-to-end: utils.py loads data, notebook executes, tests pass, and processed artifacts exist.
  - Verify: uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py -v

## Files Likely Touched

- backend/notebooks/utils.py
- backend/notebooks/__init__.py
- backend/data/processed/.gitkeep
- backend/tests/test_utils.py
- backend/notebooks/01_preprocessing.ipynb
