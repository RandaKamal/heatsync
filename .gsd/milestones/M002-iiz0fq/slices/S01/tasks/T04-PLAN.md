---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T04: Implemented model artifact save and reload path with LOAD_EXISTING_MODEL flag and helper functions in utils.py.

1. Implement artifact save: after training, save `thermal_model.joblib`, `scaler.joblib`, `feature_columns.json`, `model_metadata.json` (containing season, train/val timestamps, coefficients, metrics, plausibility verdict) to `backend/artifacts/event_device_control/models/`.
2. Also save device power model parameters (e.g., `device_power_model.joblib` or as part of metadata).
3. Implement `LOAD_EXISTING_MODEL = True` flag at notebook top: when True and all required artifact files exist, load from disk without retraining. If any file is missing, retrain and re-save.
4. Add helper functions to `utils.py`: `save_model_artifacts`, `load_model_artifacts`.
5. Verify round-trip: train → save → reload → predict produces identical results.

## Inputs

- `backend/notebooks/07_event_based_device_control.ipynb`

## Expected Output

- `backend/artifacts/event_device_control/models/thermal_model.joblib`
- `backend/artifacts/event_device_control/models/scaler.joblib`
- `backend/artifacts/event_device_control/models/feature_columns.json`
- `backend/artifacts/event_device_control/models/model_metadata.json`

## Verification

Run notebook with LOAD_EXISTING_MODEL=False (trains and saves), then conceptually verify reload path loads artifacts. Verify files exist: `ls backend/artifacts/event_device_control/models/`.
