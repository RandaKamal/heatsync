---
estimated_steps: 17
estimated_files: 2
skills_used: []
---

# T03: Quality gates and end-to-end verification

## Why
Ensures all new S03 files pass the project's Python quality gates (ruff, mypy, bandit) and that the full test suite still passes including pre-existing S01/S02 tests. This is the final verification gate before the slice can be marked complete.

## Do

1. Run ruff linter on all backend files: `uv run --project backend ruff check --config backend/pyproject.toml backend`. Fix any issues in `03_forecasting_lstm.ipynb` (if it contains .py cells that ruff checks) or `test_lstm.py`.
2. Run ruff formatter check: `uv run --project backend ruff format --config backend/pyproject.toml --check backend`. Fix formatting issues.
3. Run mypy type check: `uv run --project backend mypy --config-file backend/pyproject.toml backend`. Fix type errors in test_lstm.py.
4. Run bandit security scan: `uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests`.
5. Run py_compile on new files.
6. Run the full pytest suite: `uv run --project backend pytest backend/tests/ -v` — ensure ALL tests pass (test_utils, test_sarimax, test_lstm, and any others).
7. Re-run notebook execution: `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300`.
8. Verify notebook output contains expected metric strings by grepping the executed notebook JSON for 'RMSE' and 'MAPE'.
9. Fix any issues found. If fixes require notebook changes, re-execute to confirm.

## Done-when
- All 6 quality gate commands exit 0.
- Full pytest suite passes (including test_lstm.py, test_sarimax.py, test_utils.py).
- Notebook executes with zero exceptions.
- Notebook output contains L1 and L2 RMSE/MAPE metric values.

## Inputs

- `backend/tests/test_lstm.py`
- `backend/notebooks/03_forecasting_lstm.ipynb`
- `backend/tests/test_sarimax.py`
- `backend/tests/test_utils.py`

## Expected Output

- `backend/tests/test_lstm.py`
- `backend/notebooks/03_forecasting_lstm.ipynb`

## Verification

uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v && echo 'All gates passed'
