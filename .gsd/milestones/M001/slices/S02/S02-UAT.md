# S02: Statistical Temperature Forecasting (SARIMAX) — UAT

**Milestone:** M001
**Written:** 2026-06-20T12:23:14.617Z

# UAT Specification for Slice S02 (SARIMAX Temperature Forecasting)

## UAT-01: Programmatic Execution
- **Preconditions**: Preprocessed 15-minute aligned data exists under `backend/data/processed/`.
- **Steps**:
  1. Execute the notebook using nbconvert:
     `uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb`
- **Expected Outcome**: The notebook executes to completion without raising exceptions and outputs a converted notebook file.

## UAT-02: Metrics Verification
- **Preconditions**: Notebook executed successfully.
- **Steps**:
  1. Open/inspect cell outputs of `backend/notebooks/02_forecasting_sarimax.ipynb`.
  2. Locate metrics outputs.
- **Expected Outcome**: Valid RMSE and MAPE values are present for both heating and cooling datasets (e.g., heating RMSE: ~1.09 °C, MAPE: ~4.05%; cooling RMSE: ~1.25 °C, MAPE: ~4.79%).

## UAT-03: Visual Evidence
- **Preconditions**: Notebook executed successfully.
- **Steps**:
  1. Inspect notebook outputs for charts.
- **Expected Outcome**: Forecast-vs-actual PNG plots are embedded in the notebook's output cells.

## UAT-04: Test Suite passing
- **Preconditions**: Pytest environment ready.
- **Steps**:
  1. Run the test suite:
     `uv run --project backend pytest backend/tests/test_sarimax.py`
- **Expected Outcome**: All unit tests pass with zero failures.

