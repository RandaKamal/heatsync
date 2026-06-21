# S03: LSTM and Two-Level Forecasting Models

**Goal:** Create backend/notebooks/03_forecasting_lstm.ipynb that trains a PyTorch LSTM to forecast near-term indoor room temperature (L1 base model), applies a simple L2 residual correction layer using weather/occupancy features, and reports RMSE/MAPE for both the base and corrected forecasts. Notebook runs end-to-end programmatically with zero exceptions.
**Demo:** Runs 03_forecasting_lstm.ipynb showing PyTorch LSTM base predictions and L2 residual correction with metrics.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Created 03_forecasting_lstm.ipynb executing L1 base LSTM forecaster and L2 residual corrector with RMSE/MAPE evaluation and plots**
  - Files: `backend/notebooks/03_forecasting_lstm.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300 && echo 'Notebook executed successfully'

- [x] **T02: Created backend/tests/test_lstm.py containing sequence creation tests, LSTM pipeline checks, and L2 residual correction tests**
  - Files: `backend/tests/test_lstm.py`
  - Verify: uv run --project backend pytest backend/tests/test_lstm.py -v

- [x] **T03: Verified the S03 LSTM forecasting notebook and backend suite end to end, closing lint, type, security, compile, test, notebook execution, and metric-output gates.**
  - Files: `backend/tests/test_lstm.py`, `backend/notebooks/03_forecasting_lstm.ipynb`
  - Verify: uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v && echo 'All gates passed'

## Files Likely Touched

- backend/notebooks/03_forecasting_lstm.ipynb
- backend/tests/test_lstm.py
