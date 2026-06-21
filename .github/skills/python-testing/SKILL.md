---
name: python-testing
description: Run tests for HeatSync backend code with backend-aware target selection. Use when changing backend behavior, tests, or debugging failures.
---

# Python Testing Skill

Use this skill to run and inspect Python tests for this repository.

## Scope

- Test directory: `backend/tests/`, when present
- Test files anywhere under `backend/` matching `test_*.py` or `*_test.py`
- CI target-selection reference: `.github/workflows/ci-tests.yml`

## Running Tests

Sync the backend dev environment first:

```bash
uv sync --project backend --frozen --dev
```

When backend tests exist:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest -c backend/pyproject.toml $(git ls-files 'backend/test_*.py' 'backend/*_test.py' 'backend/**/test_*.py' 'backend/**/*_test.py') -q
```

## Target Selection

- API route changes -> route and response-shape tests.
- Control logic changes -> controller decision tests.
- Prediction changes -> predictor input/output and numeric tests.
- Anomaly changes -> detector threshold and edge-case tests.
- Impact changes -> calculator schema and aggregation tests.
- Data contract changes -> fixture and data dictionary tests.

## Pass Criteria

- The selected test command exits with code `0`.
- All collected tests pass.
- Any skipped or blocked local-dataset or optional dependency checks are named
  explicitly.
