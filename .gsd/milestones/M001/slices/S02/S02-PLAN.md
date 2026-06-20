# S02: Statistical Temperature Forecasting (SARIMAX)

**Goal:** Create backend/notebooks/02_forecasting_sarimax.ipynb that trains SARIMAX models on S01 preprocessed heating/cooling data, evaluates with RMSE and MAPE, and plots forecast-versus-actual charts. Advances R002.
**Demo:** Runs 02_forecasting_sarimax.ipynb showing SARIMAX temperature forecast with RMSE and MAPE metrics logged in output cells.

## Must-Haves

- `02_forecasting_sarimax.ipynb` exists and runs end-to-end programmatically via nbconvert with zero exceptions.
- RMSE and MAPE metrics are printed in notebook output cells for at least one window (heating).
- A forecast-vs-actual plot is generated in output cells.
- `ruff check`, `ruff format --check`, and `mypy` pass on any new/modified Python files.
- R002 is advanced (SARIMAX models forecast indoor room temperatures).

## Proof Level

- This slice proves: notebook-execution: programmatic nbconvert run with zero exceptions; metric cells contain numeric RMSE and MAPE values

## Integration Closure

S02 consumes `backend/notebooks/utils.py` (`load_processed`) and `backend/data/processed/` artifacts produced by S01. S02 produces `02_forecasting_sarimax.ipynb` consumed by S07 for end-to-end notebook suite verification.

## Verification

- RMSE and MAPE metrics are visible in notebook output cells for downstream verification.

## Tasks

- [x] **T01: Built the SARIMAX temperature forecasting notebook and added unit tests for model training and forecasting.** `est:1-2 hours`
  ## Why
  R002 requires ARIMA/SARIMAX models to forecast indoor room temperatures. This task creates the core notebook artifact.
  - Files: `backend/notebooks/02_forecasting_sarimax.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && echo 'Notebook executed successfully'

- [x] **T02: Verified notebook execution and closed quality gates for the SARIMAX temperature forecasting slice.** `est:30 minutes`
  ## Why
  Ensure the SARIMAX notebook meets milestone quality standards: programmatic execution, linting, type checking, and that RMSE/MAPE metrics are actually present in output.
  - Files: `backend/notebooks/02_forecasting_sarimax.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v

## Files Likely Touched

- backend/notebooks/02_forecasting_sarimax.ipynb
