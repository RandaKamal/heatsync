# S07: Automated Notebook Suite Verification

**Goal:** Create backend/tests/test_notebooks.py that uses nbconvert ExecutePreprocessor to execute all 6 HeatSync notebooks sequentially, assert zero execution errors, and run cleanly with uv run pytest.
**Demo:** Runs backend/tests/test_notebooks.py executing all 6 notebooks programmatically with zero exceptions.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks**
  - Files: `backend/tests/test_notebooks.py`
  - Verify: uv run --project backend python -c "import ast; ast.parse(open('backend/tests/test_notebooks.py').read()); print('syntax ok')" && uv run --project backend ruff check backend/tests/test_notebooks.py && uv run --project backend ruff format --check backend/tests/test_notebooks.py

- [x] **T02: Executed and verified the full 6-notebook test suite and completed Python quality gate checks on test_notebooks.py.**
  - Files: `backend/tests/test_notebooks.py`
  - Verify: uv run --project backend pytest backend/tests/test_notebooks.py -v

## Files Likely Touched

- backend/tests/test_notebooks.py
