# S03: LSTM and Two-Level Forecasting Models — UAT

**Milestone:** M001
**Written:** 2026-06-20T14:21:15.933Z

# UAT for S03: LSTM and Two-Level Forecasting Models

## Execution Type
- **uat-runtime-check**
- **uat-artifact-check**

## Preconditions
1. Python dependencies sync'd via `uv`.
2. Raw data preprocessed and available in `backend/data/processed/` (output of S01).

## Steps
1. Run programmatic notebook execution:
   ```bash
   uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300
   ```
2. Verify that output file `backend/notebooks/03_forecasting_lstm.nbconvert.ipynb` contains positive float values for L1 RMSE/MAPE and L2 RMSE/MAPE under both Heating and Cooling runs.
3. Run the pytest suite to verify deterministic sequences and pipeline components:
   ```bash
   uv run --project backend pytest backend/tests/test_lstm.py -v
   ```

## Expected Outcomes
- Programmatic execution completes without exceptions.
- Output cells show that the L2 residual correction reduces (or at least completes with valid finite) RMSE and MAPE relative to L1.
- All pytest test cases pass successfully.

