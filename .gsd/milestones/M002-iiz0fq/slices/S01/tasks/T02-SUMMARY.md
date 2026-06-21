---
id: T02
parent: S01
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/utils.py
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/tests/test_utils.py
key_decisions:
  - Allowed coefficients that are close to zero (within 1e-2 tolerance) to pass the plausibility check, allowing very small negative values for the outside temperature coefficient during the heating season to remain valid.
  - Implemented Room-Level temperature persistence as a fallback when physical thermal coefficients violate stability constraints.
duration: 
verification_result: passed
completed_at: 2026-06-21T03:23:33.501Z
blocker_discovered: false
---

# T02: Implemented and verified grey-box thermal model training pipeline with coefficient check, fallback, and validation.

**Implemented and verified grey-box thermal model training pipeline with coefficient check, fallback, and validation.**

## What Happened

We implemented the grey-box thermal model using Ridge regression, scaling the input features using StandardScaler. We added helpers check_coefficient_plausibility, train_thermal_model, and predict_temperature to utils.py.
We split the datasets temporally: heating train is before 2026-04-03, cooling train is before 2026-05-28. Both validation splits successfully passed the MAE < 2.0 °C threshold (heating MAE: 0.12 °C, cooling MAE: 0.09 °C).
We appended markdown and code cells executing, checking, and saving/reloading the models inside 07_event_based_device_control.ipynb.
We added detailed unit tests to test_utils.py to cover successful training, fallback activation under implausible coefficients, input verification, and prediction error scenarios. All 30 tests in the test suite pass successfully.

## Verification

Ran pytest for utils.py and validated complete notebook execution, producing joblib model artifacts.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `backend/.venv/bin/pytest backend/tests/test_utils.py -v` | 0 | ✅ pass | 2860ms |
| 2 | `nbconvert execution check of 07_event_based_device_control.ipynb` | 0 | ✅ pass | 13273ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/tests/test_utils.py`
