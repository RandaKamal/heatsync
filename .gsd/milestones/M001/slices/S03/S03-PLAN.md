# S03: LSTM and Two-Level Forecasting Models

**Goal:** Create backend/notebooks/03_forecasting_lstm.ipynb that trains a PyTorch LSTM to forecast near-term indoor room temperature (L1 base model), applies a simple L2 residual correction layer using weather/occupancy features, and reports RMSE/MAPE for both the base and corrected forecasts. Notebook runs end-to-end programmatically with zero exceptions.
**Demo:** Runs 03_forecasting_lstm.ipynb showing PyTorch LSTM base predictions and L2 residual correction with metrics.

## Must-Haves

- `03_forecasting_lstm.ipynb` executes end-to-end via nbconvert with zero exceptions.
- Base LSTM (L1) RMSE and MAPE values are printed in notebook output cells and are finite positive numbers.
- Residual-corrected (L2) RMSE and MAPE values are printed in notebook output cells and are finite positive numbers.
- Forecast-versus-actual plots are rendered for both base and corrected predictions.
- `backend/tests/test_lstm.py` passes with all assertions via pytest.
- ruff, mypy, bandit quality gates pass on all new files.

## Proof Level

- This slice proves: unit-tests + notebook execution + quality-gates

## Integration Closure

Consumes `backend/notebooks/utils.py` (load_processed, feature columns) and `backend/data/processed/` CSV artifacts from S01. Produces `03_forecasting_lstm.ipynb` with visible RMSE/MAPE metrics that S07 will verify via programmatic notebook execution.

## Verification

- Notebook output cells display L1 and L2 RMSE/MAPE metrics and forecast-versus-actual charts for human and automated inspection.

## Tasks

- [x] **T01: Created 03_forecasting_lstm.ipynb executing L1 base LSTM forecaster and L2 residual corrector with RMSE/MAPE evaluation and plots** `est:XL`
  ## Why
  R003 requires LSTM base prediction (L1) and residual correction using weather/occupancy variables (L2). This is the core deliverable of the slice — the runnable, reader-friendly PyTorch LSTM forecasting notebook.
  - Files: `backend/notebooks/03_forecasting_lstm.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300 && echo 'Notebook executed successfully'

- [x] **T02: Created backend/tests/test_lstm.py containing sequence creation tests, LSTM pipeline checks, and L2 residual correction tests** `est:M`
  ## Why
  Unit tests validate the LSTM pipeline components independently and serve as regression guards for S07. Follows the test_sarimax.py pattern established by S02.
  - Files: `backend/tests/test_lstm.py`
  - Verify: uv run --project backend pytest backend/tests/test_lstm.py -v

- [x] **T03: Verified the S03 LSTM forecasting notebook and backend suite end to end, closing lint, type, security, compile, test, notebook execution, and metric-output gates.** `est:S`
  ## Why
  Ensures all new S03 files pass the project's Python quality gates (ruff, mypy, bandit) and that the full test suite still passes including pre-existing S01/S02 tests. This is the final verification gate before the slice can be marked complete.
  - Files: `backend/tests/test_lstm.py`, `backend/notebooks/03_forecasting_lstm.ipynb`
  - Verify: uv run --project backend ruff check --config backend/pyproject.toml backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend pytest backend/tests/ -v && echo 'All gates passed'

## Files Likely Touched

- backend/notebooks/03_forecasting_lstm.ipynb
- backend/tests/test_lstm.py
