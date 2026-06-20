---
estimated_steps: 19
estimated_files: 1
skills_used: []
---

# T02: Created backend/tests/test_lstm.py containing sequence creation tests, LSTM pipeline checks, and L2 residual correction tests

## Why
Unit tests validate the LSTM pipeline components independently and serve as regression guards for S07. Follows the test_sarimax.py pattern established by S02.

## Do

1. Create `backend/tests/test_lstm.py` following the pattern in `backend/tests/test_sarimax.py`.
2. **`test_lstm_pipeline_heating()`:** Load processed heating data via `load_processed('heating')`. Select first device, sort index, set `asfreq('15min')`. Prepare sequences with a small SEQ_LEN (e.g. 8) and HORIZON=1. Train a minimal LSTM (hidden_dim=16, epochs=5) on a subset. Assert predictions are finite, RMSE is finite and positive.
3. **`test_lstm_residual_correction()`:** After running an L1 model, compute residuals. Fit a small L2 feedforward model on weather/occupancy covariates. Assert L2 corrections are finite, combined predictions are finite, combined RMSE is finite and positive.
4. **`test_sequence_creation()`:** Test the sequence creation function with synthetic data. Assert output shapes match expected `(N, seq_len, n_features)` and `(N,)`. Assert edge cases: data shorter than seq_len + horizon returns empty arrays.
5. All tests must use `torch.manual_seed(42)` and `np.random.seed(42)` for determinism.
6. Keep model sizes tiny (hidden_dim=16, epochs=5) so tests run in seconds, not minutes.
7. Use type annotations and follow project ruff/mypy conventions.

## Done-when
- `backend/tests/test_lstm.py` exists with at least 3 test functions.
- `uv run --project backend pytest backend/tests/test_lstm.py -v` passes with all tests green.
- Tests complete in under 60 seconds total.

## Key interfaces
- `from notebooks.utils import load_processed` — loads processed DataFrames.
- Target column: `status_temperature_in_celsius`
- Covariates: `outside_temperature`, `occupancy_flag`, `hour_of_day`
- Test must import torch and nn from the backend uv environment.

## Inputs

- `backend/notebooks/03_forecasting_lstm.ipynb`
- `backend/tests/test_sarimax.py`
- `backend/data/processed/processed_heating.csv`

## Expected Output

- `backend/tests/test_lstm.py`

## Verification

uv run --project backend pytest backend/tests/test_lstm.py -v
