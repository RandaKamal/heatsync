---
estimated_steps: 12
estimated_files: 5
skills_used: []
---

# T04: Verified the preprocessing utilities, tests, processed CSV artifacts, and notebook execution end-to-end, with backend pytest collection fixed for repository-root imports.

**Why:** Final verification ensures all artifacts pass project quality gates (ruff, mypy, bandit) and the full pipeline works end-to-end: utils.py loads data, notebook executes, tests pass, and processed artifacts exist.

**Do:**
1. Run ruff check on all new Python files under backend/notebooks/.
2. Run ruff format --check on all new Python files.
3. Run mypy on backend/notebooks/utils.py.
4. Run bandit on backend/notebooks/utils.py (exclude tests).
5. Run the full pytest suite to verify no regressions: `uv run --project backend pytest backend/tests/ -v`.
6. Verify processed CSV artifacts exist under backend/data/processed/ with expected columns.
7. Re-run the notebook execution to confirm end-to-end reproducibility.
8. Fix any issues found during verification.

**Done-when:** All quality gates pass, all tests pass, notebook executes, processed CSVs exist with correct schema.

**Skills:** python-linting, verify-before-complete

## Inputs

- `backend/notebooks/utils.py`
- `backend/notebooks/01_preprocessing.ipynb`
- `backend/tests/test_utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/processed_cooling.csv`

## Expected Output

- Update the implementation and proof artifacts needed for this task.

## Verification

uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py -v
