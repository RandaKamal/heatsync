---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T03: Fix Typing and Linting (Mypy, Ruff, Bandit)

Run the full suite of backend quality gates (ruff check, ruff format, mypy, bandit) against `backend/notebooks/utils.py`, `backend/tests/`, and all newly added helpers. Fix any typing or linting violations that emerge from the M002 slices. Ensure type hints are accurate and missing docstrings are added if required by the linter.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_notebooks.py`
- `backend/tests/test_event_control_reporting.py`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_notebooks.py`
- `backend/tests/test_event_control_reporting.py`

## Verification

uv run --project backend ruff check backend && uv run --project backend ruff format --check backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests
