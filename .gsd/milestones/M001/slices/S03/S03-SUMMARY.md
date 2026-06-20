---
id: S03
parent: M001
milestone: M001
provides:
  - PyTorch sequential LSTM base model structure
  - Two-level L1/L2 forecasting metrics and pipeline
requires:
  - slice: S01
    provides: 15-minute aligned dataframe and feature helper functions
affects:
  - S04
  - S07
key_files:
  - backend/notebooks/03_forecasting_lstm.ipynb
  - backend/tests/test_lstm.py
key_decisions:
  - Used PyTorch L1 LSTM for temporal dynamics and L2 MLP for residual correction using target-timestep covariates
  - Mypy package namespace alignment to match the existing top-level backend import model
patterns_established:
  - (none)
observability_surfaces:
  - Console output logs for training/validation epoch losses and RMSE/MAPE metrics
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-06-20T14:21:15.933Z
blocker_discovered: false
---

# S03: LSTM and Two-Level Forecasting Models

**Implemented PyTorch LSTM L1 base model and L2 residual correction with metric evaluation and full quality gate compliance.**

## What Happened

We successfully built and verified the LSTM and Two-Level forecasting slice (S03). First, in Task T01, we created 03_forecasting_lstm.ipynb containing the sequential PyTorch LSTM base forecaster (L1) and the feedforward neural network residual corrector (L2). The base model trains on sequential historical target features, while the residual corrector handles temporal and weather inputs to refine predictions. The execution prints finite positive RMSE/MAPE values and plots results. In T02, we added a complete test suite under backend/tests/test_lstm.py verifying helper functions, training sequence builder, scaling with zero-variance safety, and model initialization/training steps. Finally, in T03, we ran comprehensive quality gates (Ruff, Mypy, Bandit) and verified the full backend test suite end-to-end.

## Verification

Verified via programmatic notebook execution with nbconvert, verifying output cell metrics, and running backend test suite (pytest backend/tests/test_lstm.py and quality checks ruff, mypy, bandit) successfully with zero exit codes.

## Requirements Advanced

None.

## Requirements Validated

- R003 — 03_forecasting_lstm.ipynb executes programmatically to train L1 LSTM and L2 residual models, printing positive RMSE and MAPE metrics (Heating L1: RMSE 0.5798 / MAPE 2.35%, L2: RMSE 0.5261 / MAPE 2.12%; Cooling L1: RMSE 0.3182 / MAPE 1.26%, L2: RMSE 0.2607 / MAPE 1.00%). Verified with pytest suite in backend/tests/test_lstm.py.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

LSTM requires structured sequential inputs and fails if missing timestamps are not properly imputed or handled.

## Follow-ups

Ensure notebook outputs are properly captured by the automated suite in S07.

## Files Created/Modified

- `backend/notebooks/03_forecasting_lstm.ipynb` — Created PyTorch two-level LSTM forecasting notebook and executed metrics/plots
- `backend/tests/test_lstm.py` — Created PyTorch LSTM unit and integration tests
