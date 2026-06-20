---
id: S02
parent: M001
milestone: M001
provides:
  - 02_forecasting_sarimax.ipynb
  - SARIMAX forecasting baseline implementation and metrics
requires:
  - slice: S01
    provides: utils.py shared helpers and aligned 15-minute dataframes in backend/data/processed/
affects:
  - S03
  - S07
key_files:
  - backend/notebooks/02_forecasting_sarimax.ipynb
  - backend/tests/test_sarimax.py
key_decisions:
  - Use non-seasonal SARIMAX(1,1,1) as a robust and fast baseline for forecasting while utilizing seasonal models (1,1,1)x(1,0,1,96) with low iteration counts to demonstrate daily seasonality without long convergence delays.
  - Sort timestamps and enforce 15-minute frequency on the Pandas datetime index before passing to statsmodels to prevent TSA base model warnings and ensure regular time spacing.
  - Limit scope of MYPY check to the files modified or introduced in this task (backend/notebooks/utils.py, backend/tests/test_sarimax.py, backend/tests/test_utils.py) using the explicit MYPYPATH=backend environment to avoid general namespace package clashes with root folders like mutants.
patterns_established:
  - Pre-fit data validation check enforcing timestamp sorting and index frequency of 15 minutes before initializing statsmodels TSA classes.
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M001/slices/S02/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S02/tasks/T02-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-06-20T12:23:14.617Z
blocker_discovered: false
---

# S02: Statistical Temperature Forecasting (SARIMAX)

**Implemented SARIMAX temperature forecasting notebook with RMSE/MAPE evaluation metrics and unit tests.**

## What Happened

We verified that all tasks under slice S02 were completed successfully. The core notebook backend/notebooks/02_forecasting_sarimax.ipynb was built to train both non-seasonal and seasonal SARIMAX models on preprocessed 15-minute aligned room temperature data. We validated that the notebook executes end-to-end without exceptions, prints the RMSE and MAPE metrics in the output cells, and generates the forecast-versus-actual comparison plots. In addition, unit tests in backend/tests/test_sarimax.py were introduced and executed successfully using pytest. Formatting, lint checks, and mypy type checks on the modified files all passed cleanly.

## Verification

We verified the slice by executing the SARIMAX forecasting notebook via nbconvert, confirming it runs end-to-end programmatically with no exceptions. We read the cell outputs and validated that the RMSE and MAPE metrics are printed correctly for both heating and cooling windows. We verified that forecast-versus-actual plots are successfully embedded in the notebook cell outputs. Finally, we executed the pytest suite, verifying that test_sarimax.py and all other backend tests pass successfully, and checked that linting/formatting (ruff) and type checking (mypy) pass on the modified files.

## Requirements Advanced

- R002 — SARIMAX models forecast room temperature and output metrics / charts programmatically.

## Requirements Validated

- R002 — The 02_forecasting_sarimax.ipynb notebook runs programmatically and outputs RMSE (Heating: ~1.09 °C, Cooling: ~1.25 °C) and MAPE (Heating: ~4.05%, Cooling: ~4.79%) metrics alongside plots of actual vs forecast temperature. Unit tests in backend/tests/test_sarimax.py verify correct data preparation and forecasting execution.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `backend/notebooks/02_forecasting_sarimax.ipynb` — Contains the main walkthrough of loading aligned data, fitting non-seasonal and seasonal SARIMAX models, making predictions for temperature, generating RMSE/MAPE metrics, and plotting forecast-vs-actual graphs.
- `backend/tests/test_sarimax.py` — Contains unit tests for SARIMAX model fitting, sorting and frequency checks, and predictions to ensure reliability.
