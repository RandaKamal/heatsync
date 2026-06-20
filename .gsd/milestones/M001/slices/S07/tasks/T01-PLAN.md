---
estimated_steps: 22
estimated_files: 1
skills_used: []
---

# T01: Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks

## Why
R007 requires an automated script running all 6 notebooks end-to-end with zero exceptions. Prior slices (S02–S06) each have their own `test_notebook_execution()` in individual test files, but there is no single unified suite that runs the complete set. This task creates that unified gate.

## Do
1. Read the existing notebook execution pattern from `backend/tests/test_physical.py` (lines ~275-290) as the reference implementation — it uses `nbformat.read()` + `ExecutePreprocessor(timeout=300, kernel_name='python3')` + `ep.preprocess(nb, {'metadata': {'path': 'backend/notebooks'}})`.
2. Create `backend/tests/test_notebooks.py` with:
   - Imports: `os`, `pytest`, `nbformat`, `nbconvert.preprocessors.ExecutePreprocessor`.
   - A module-level constant `NOTEBOOKS_DIR = os.path.join(os.path.dirname(__file__), '..', 'notebooks')` resolving to `backend/notebooks/`.
   - An ordered list of notebook filenames: `['01_preprocessing.ipynb', '02_forecasting_sarimax.ipynb', '03_forecasting_lstm.ipynb', '04_physical_modeling.ipynb', '05_anomaly_detection.ipynb', '06_energy_controls.ipynb']`.
   - A `@pytest.mark.parametrize` test function `test_notebook_execution(notebook_filename)` that:
     a. Asserts the notebook file exists at the expected path.
     b. Reads the notebook with `nbformat.read(f, as_version=4)`.
     c. Creates `ExecutePreprocessor(timeout=600, kernel_name='python3')` — use 600s timeout since the full suite includes LSTM and PINN training.
     d. Calls `ep.preprocess(nb, {'metadata': {'path': os.path.join(NOTEBOOKS_DIR)}})` to execute.
     e. If execution raises `CellExecutionError`, the pytest assertion failure message should include the notebook name and the exception text for actionable diagnostics.
   - Type annotations on all functions. Return type `-> None`.
   - `# type: ignore[import-untyped]` on nbconvert import to match existing pattern.
3. Ensure the file has no trailing whitespace, uses double quotes for strings consistently with ruff defaults, and follows existing test conventions.

## Done-when
- `backend/tests/test_notebooks.py` exists with 6 parametrized test cases.
- The file is valid Python (compiles without syntax errors).
- Ruff check and ruff format --check pass on the file.
- Mypy passes on the file with `--ignore-missing-imports`.

## Inputs

- `backend/tests/test_physical.py`
- `backend/tests/test_energy.py`
- `backend/notebooks/`

## Expected Output

- `backend/tests/test_notebooks.py`

## Verification

uv run --project backend python -c "import ast; ast.parse(open('backend/tests/test_notebooks.py').read()); print('syntax ok')" && uv run --project backend ruff check backend/tests/test_notebooks.py && uv run --project backend ruff format --check backend/tests/test_notebooks.py
