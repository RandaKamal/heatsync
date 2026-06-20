# S07: Automated Notebook Suite Verification

**Goal:** Create backend/tests/test_notebooks.py that uses nbconvert ExecutePreprocessor to execute all 6 HeatSync notebooks sequentially, assert zero execution errors, and run cleanly with uv run pytest.
**Demo:** Runs backend/tests/test_notebooks.py executing all 6 notebooks programmatically with zero exceptions.

## Must-Haves

- `uv run --project backend pytest backend/tests/test_notebooks.py -v` exits 0 with 6 passing tests (one per notebook).
- Each notebook executes end-to-end via ExecutePreprocessor with zero uncaught exceptions.
- Notebooks run in dependency order: 01 → 02, 03, 04, 05 (parallel-safe but sequential in test) → 06.
- Ruff check, ruff format --check, and mypy pass on the new test file.
- R007 is validated: automated script runs all notebooks end-to-end with zero exceptions.

## Proof Level

- This slice proves: pytest execution evidence: 6 tests pass, exit code 0.

## Integration Closure

Consumes all 6 notebooks from S01–S06 and backend/data/ inputs. Produces pytest pass/fail verdicts. No downstream slices depend on S07.

## Verification

- None — test-only slice.

## Tasks

- [x] **T01: Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks** `est:small (1-2 steps)`
  ## Why
  R007 requires an automated script running all 6 notebooks end-to-end with zero exceptions. Prior slices (S02–S06) each have their own `test_notebook_execution()` in individual test files, but there is no single unified suite that runs the complete set. This task creates that unified gate.
  - Files: `backend/tests/test_notebooks.py`
  - Verify: uv run --project backend python -c "import ast; ast.parse(open('backend/tests/test_notebooks.py').read()); print('syntax ok')" && uv run --project backend ruff check backend/tests/test_notebooks.py && uv run --project backend ruff format --check backend/tests/test_notebooks.py

- [x] **T02: Executed and verified the full 6-notebook test suite and completed Python quality gate checks on test_notebooks.py.** `est:medium (notebook execution takes several minutes)`
  ## Why
  T01 created the test file; this task proves it actually works by executing the full 6-notebook suite via pytest and running all quality gates. This validates R007.
  - Files: `backend/tests/test_notebooks.py`
  - Verify: uv run --project backend pytest backend/tests/test_notebooks.py -v

## Files Likely Touched

- backend/tests/test_notebooks.py
