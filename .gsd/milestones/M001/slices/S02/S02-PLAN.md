# S02: Statistical Temperature Forecasting (SARIMAX)

**Goal:** Create backend/notebooks/02_forecasting_sarimax.ipynb that trains SARIMAX models on S01 preprocessed heating/cooling data, evaluates with RMSE and MAPE, and plots forecast-versus-actual charts. Advances R002.
**Demo:** Runs 02_forecasting_sarimax.ipynb showing SARIMAX temperature forecast with RMSE and MAPE metrics logged in output cells.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Built the SARIMAX temperature forecasting notebook and added unit tests for model training and forecasting.**
  - Files: `backend/notebooks/02_forecasting_sarimax.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && echo 'Notebook executed successfully'

- [x] **T02: Verified notebook execution and closed quality gates for the SARIMAX temperature forecasting slice.**
  - Files: `backend/notebooks/02_forecasting_sarimax.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v

## Files Likely Touched

- backend/notebooks/02_forecasting_sarimax.ipynb
