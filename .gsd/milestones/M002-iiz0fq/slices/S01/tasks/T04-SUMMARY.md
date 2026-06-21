---
id: T04
parent: S01
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/utils.py
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/tests/test_utils.py
key_decisions:
  - Replaced manually written joblib calls in event-based device control notebook with standardized save_model_artifacts and load_model_artifacts helper functions from utils.py
  - Enabled LOAD_EXISTING_MODEL top-level configuration flag to support reading trained models directly from disk and avoiding training from scratch if files exist
duration: 
verification_result: passed
completed_at: 2026-06-21T04:08:45.594Z
blocker_discovered: false
---

# T04: Implemented model artifact save and reload path with LOAD_EXISTING_MODEL flag and helper functions in utils.py.

**Implemented model artifact save and reload path with LOAD_EXISTING_MODEL flag and helper functions in utils.py.**

## What Happened

We implemented the saving and reloading logic of all trained models (grey-box thermal model and learned device power model) for both heating and cooling seasons.
First, we added `save_model_artifacts` and `load_model_artifacts` in `backend/notebooks/utils.py` to handle serializing model parameters, scaler parameters, features list, and model metadata (including coefficients and metrics) to `backend/artifacts/event_device_control/models/`.
Second, we updated the notebook `07_event_based_device_control.ipynb` with `LOAD_EXISTING_MODEL = True` and checked for file existence before reloading models. If models are not present, training is executed from scratch and models are saved.
Third, we verified the round-trip through both pytest on `backend/tests/test_utils.py` and running the notebook via `pytest backend/tests/test_notebooks.py` on the modified notebook. All checks passed successfully.

## Verification

Ran new unit tests in test_utils.py checking saving/loading logic. Verified that notebook runs correctly with both true and false values of LOAD_EXISTING_MODEL flag. Checked model files are successfully generated.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_utils.py -p no:launch_testing -p no:launch_testing_ros_pytest_entrypoint` | 0 | ✅ pass | 3285ms |
| 2 | `uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control -p no:launch_testing -p no:launch_testing_ros_pytest_entrypoint` | 0 | ✅ pass | 7710ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/tests/test_utils.py`
