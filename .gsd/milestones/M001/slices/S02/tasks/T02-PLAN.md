---
estimated_steps: 27
estimated_files: 1
skills_used: []
---

# T02: Verify notebook execution and quality gates

## Why
Ensure the SARIMAX notebook meets milestone quality standards: programmatic execution, linting, type checking, and that RMSE/MAPE metrics are actually present in output.

## Do
1. Run the notebook programmatically via nbconvert and confirm zero exceptions:
   ```bash
   uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb
   ```
2. Verify RMSE and MAPE appear in notebook output cells by inspecting the executed notebook's cell outputs (grep for 'RMSE' and 'MAPE' in the output notebook).
3. Run quality gates on any new or modified `.py` files (utils.py if modified):
   ```bash
   uv run --project backend ruff check --config backend/pyproject.toml backend
   uv run --project backend ruff format --config backend/pyproject.toml --check backend
   uv run --project backend mypy --config-file backend/pyproject.toml backend
   ```
4. Run existing tests to confirm no regressions:
   ```bash
   uv run --project backend pytest backend/tests/ -v
   ```
5. If any gate fails on notebook-embedded code, fix the notebook and re-run.

## Done-when
- Notebook executes end-to-end with zero exceptions.
- Output cells contain 'RMSE' and 'MAPE' with numeric values.
- ruff check, ruff format --check, and mypy pass.
- Existing pytest suite passes (no regressions from S01).

## Assumptions
- T01 has already created the notebook. This task is pure verification and fix-up.
- Quality gates may flag notebook-embedded code only if .py files are modified.

## Inputs

- `backend/notebooks/02_forecasting_sarimax.ipynb`
- `backend/notebooks/utils.py`

## Expected Output

- `backend/notebooks/02_forecasting_sarimax.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v
