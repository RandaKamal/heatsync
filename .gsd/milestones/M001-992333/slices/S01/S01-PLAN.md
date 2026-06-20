# S01: Data Preprocessing and Shared Utilities

**Goal:** Provide clean, resampled, and aligned 15-minute datasets for heating and cooling windows, along with shared utility code and end-to-end notebook execution tests.
**Demo:** Reads raw CSVs and outputs normalized 15-min aligned dataframes via utils.py.

## Must-Haves

- 1. Preprocessing utilities resample data to 15-minute grids. 2. 01_preprocessing.ipynb runs end-to-end and writes processed heating/cooling CSVs. 3. pytest runs 01_preprocessing.ipynb and reports success.

## Proof Level

- This slice proves: Unit tests and notebook execution integration test passing in CI.

## Integration Closure

The processed heating and cooling datasets are saved as CSV files and can be successfully loaded and verified by pytest, with ruff linting, ruff formatting, and mypy type checks passing.

## Verification

- We will log data loading shapes, null counts, and execution duration during preprocessing and notebook tests.

## Tasks

- [x] **T01: Added pandas, scipy, statsmodels, torch, scikit-learn, matplotlib, jupyter, ipykernel, nbconvert, nbformat, and pandas-stubs dependencies to backend/pyproject.toml and successfully ran uv sync.** `est:1h`
  Add pandas, scipy, statsmodels, torch, scikit-learn, matplotlib, jupyter, ipykernel, nbconvert, nbformat, and pandas-stubs dependencies to backend/pyproject.toml and run uv sync.
  - Files: `backend/pyproject.toml`
  - Verify: uv run --project backend python -c "import pandas, scipy, statsmodels, torch, sklearn, matplotlib, nbconvert, nbformat; print('all imported')"

- [ ] **T02: Implement shared preprocessing utilities** `est:2h`
  Create backend/notebooks/utils.py with functions for loading CSVs, aligning to 15-minute clock, linearly interpolating missing values, engineering features, and estimating occupancy heat gains.
  - Files: `backend/notebooks/utils.py`
  - Verify: uv run --project backend python -m py_compile backend/notebooks/utils.py && uv run --project backend ruff check backend/notebooks/utils.py

- [ ] **T03: Implement data preprocessing notebook** `est:2h`
  Create backend/notebooks/01_preprocessing.ipynb that loads heating and cooling data, processes them using utils.py, and saves the aligned dataframes to processed CSVs.
  - Files: `backend/notebooks/01_preprocessing.ipynb`
  - Verify: uv run --project backend python -c "import nbformat; nb = nbformat.read('backend/notebooks/01_preprocessing.ipynb', as_version=4); print(f'Read notebook with {len(nb.cells)} cells')"

- [ ] **T04: Create notebook integration test** `est:1.5h`
  Implement backend/tests/test_notebooks.py using nbconvert and nbformat to execute the notebooks headlessly. Verify that 01_preprocessing.ipynb runs successfully and that all quality checks (linting, format, type check) pass.
  - Files: `backend/tests/test_notebooks.py`
  - Verify: PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest backend/tests/test_notebooks.py -v

## Files Likely Touched

- backend/pyproject.toml
- backend/notebooks/utils.py
- backend/notebooks/01_preprocessing.ipynb
- backend/tests/test_notebooks.py
