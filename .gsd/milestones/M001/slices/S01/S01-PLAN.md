# S01: Data Preprocessing and Shared Utilities

**Goal:** Deliver backend/notebooks/utils.py with shared CSV loading, 15-minute alignment, interpolation tracking, and feature engineering helpers, plus backend/notebooks/01_preprocessing.ipynb as a teaching walkthrough that produces cached processed DataFrames under backend/data/processed/.
**Demo:** Reads raw CSVs from backend/data/ and outputs normalized 15-min aligned dataframes via utils.py; 01_preprocessing.ipynb renders clean output cells.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.**
  - Files: `backend/notebooks/utils.py`, `backend/notebooks/__init__.py`, `backend/data/processed/.gitkeep`
  - Verify: uv run --project backend python -c "import notebooks.utils; print('import ok')" && uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py

- [x] **T02: Implemented comprehensive pytest coverage for preprocessing utilities in test_utils.py.**
  - Files: `backend/tests/test_utils.py`
  - Verify: uv run --project backend pytest backend/tests/test_utils.py -v && uv run --project backend ruff check --config backend/pyproject.toml backend/tests/test_utils.py

- [x] **T03: Created 01_preprocessing.ipynb teaching walkthrough notebook and cached processed heating/cooling datasets.**
  - Files: `backend/notebooks/01_preprocessing.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --ExecutePreprocessor.timeout=120 --output /tmp/test_01_output.ipynb

- [x] **T04: Verified the preprocessing utilities, tests, processed CSV artifacts, and notebook execution end-to-end, with backend pytest collection fixed for repository-root imports.**
  - Verify: uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py -v

## Files Likely Touched

- backend/notebooks/utils.py
- backend/notebooks/__init__.py
- backend/data/processed/.gitkeep
- backend/tests/test_utils.py
- backend/notebooks/01_preprocessing.ipynb
