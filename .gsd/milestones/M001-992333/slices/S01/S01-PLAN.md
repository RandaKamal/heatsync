# S01: Data Preprocessing and Shared Utilities

**Goal:** Provide clean, resampled, and aligned 15-minute datasets for heating and cooling windows, along with shared utility code and end-to-end notebook execution tests.
**Demo:** Reads raw CSVs and outputs normalized 15-min aligned dataframes via utils.py.

## Must-Haves

- 1. Preprocessing utilities resample data to 15-minute grids. 2. 01_preprocessing.ipynb runs end-to-end and writes processed heating/cooling CSVs. 3. pytest runs 01_preprocessing.ipynb and reports success.

## Proof Level

- This slice proves: Unit tests and notebook execution integration test passing in CI.

## Integration Closure

The processed heating and cooling datasets are saved as CSV files and can be successfully loaded and verified by pytest, with ruff linting, format check passing and execution passing.

## Verification

- Logging execution time and processed row counts.

## Tasks

- [x] **T01: Initialize notebook structure and test harness** `est:1`
  Set up backend/notebooks directory, uv project config for notebook dependencies (jupyter, pandas, matplotlib), and create a basic test script to ensure notebooks can be executed headlessly.
  - Files: `backend/pyproject.toml`
  - Verify: uv run --project backend pytest backend/notebooks/test_notebook_execution.py

- [ ] **T02: Implement shared preprocessing utilities** `est:1`
  Create backend/notebooks/utils.py with functions for loading CSVs, aligning to 15-minute clock, linearly interpolating missing values, engineering features, and estimating occupancy heat gains.
  - Files: `backend/notebooks/utils.py`
  - Verify: uv run --project backend python -m py_compile backend/notebooks/utils.py && uv run --project backend ruff check backend/notebooks/utils.py

- [ ] **T03: Implement data preprocessing notebook** `est:1`
  Create backend/notebooks/01_preprocessing.ipynb that loads heating and cooling data, processes them using utils.py, and saves the aligned dataframes to processed CSVs.
  - Files: `backend/notebooks/01_preprocessing.ipynb`
  - Verify: uv run --project backend python -c "import nbformat; nb = nbformat.read('backend/notebooks/01_preprocessing.ipynb', as_version=4); print(f'Read notebook with {len(nb.cells)} cells')"

- [ ] **T04: Add automated execution test for preprocessing notebook** `est:1`
  Write pytest tests in backend/tests/test_notebooks.py to execute 01_preprocessing.ipynb programmatically via nbclient/nbconvert, ensuring it completes without errors and produces the expected outputs.
  - Files: `backend/tests/test_notebooks.py`
  - Verify: uv run --project backend pytest backend/tests/test_notebooks.py -v

## Files Likely Touched

- backend/pyproject.toml
- backend/notebooks/utils.py
- backend/notebooks/01_preprocessing.ipynb
- backend/tests/test_notebooks.py
