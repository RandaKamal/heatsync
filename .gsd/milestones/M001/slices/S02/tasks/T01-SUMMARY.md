---
id: T01
parent: S02
milestone: M001
key_files:
  - backend/notebooks/02_forecasting_sarimax.ipynb
  - backend/tests/test_sarimax.py
key_decisions:
  - Use non-seasonal SARIMAX(1,1,1) as a robust and fast baseline for forecasting while utilizing seasonal models (1,1,1)x(1,0,1,96) with low iteration counts to demonstrate daily seasonality without long convergence delays.
  - Sort timestamps and enforce 15-minute frequency on the Pandas datetime index before passing to statsmodels to prevent TSA base model warnings and ensure regular time spacing.
duration: 
verification_result: passed
completed_at: 2026-06-20T12:02:14.092Z
blocker_discovered: false
---

# T01: Built the SARIMAX temperature forecasting notebook and added unit tests for model training and forecasting.

**Built the SARIMAX temperature forecasting notebook and added unit tests for model training and forecasting.**

## What Happened

Created the Jupyter notebook backend/notebooks/02_forecasting_sarimax.ipynb containing a comprehensive walkthrough of temperature forecasting using statsmodels SARIMAX. The notebook loads processed telemetry from the heating/cooling windows, performs chronological train/test splits (80/20), utilizes outdoor temperature as an exogenous regressor, fits non-seasonal and seasonal SARIMAX models, prints RMSE and MAPE metrics, and renders forecast-vs-actual plots. In addition, we added backend/tests/test_sarimax.py to ensure the model fitting, forecasting, and evaluation pipeline remains verified and protected against regressions.

## Verification

Verified that the notebook executes successfully end-to-end via jupyter nbconvert and that all backend tests pass using pytest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `PYTHONPATH=backend PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest backend/tests/test_sarimax.py -v` | 0 | ✅ pass | 500ms |
| 2 | `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/02_forecasting_sarimax.ipynb` | 0 | ✅ pass | 5000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/02_forecasting_sarimax.ipynb`
- `backend/tests/test_sarimax.py`
