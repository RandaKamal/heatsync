---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T03: Verified the S03 LSTM forecasting notebook and backend suite end to end, closing lint, type, security, compile, test, notebook execution, and metric-output gates.

## Inputs

- None specified.

## Expected Output

- `backend/tests/test_lstm.py`
- `backend/notebooks/03_forecasting_lstm.ipynb`

## Verification

uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v && echo 'All gates passed'
