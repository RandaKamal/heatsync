# S01: Data Pipeline, Thermal Model, and Device Power Model

**Goal:** Establish the complete data pipeline from raw CSVs through 15-min aligned device-level and room-level features, train the grey-box thermal model and learned device power model on both seasons, and prove save/reload of all artifacts.
**Demo:** Notebook cells 1–N execute on both heating and cooling seasons: config dicts visible, data loaded and merged to 15-min grid with device-level and room-level features, grey-box thermal model trained with physically plausible coefficients (or room-level fallback activated), device power model trained, all model artifacts saved to backend/artifacts/event_device_control/models/ and successfully reloaded with LOAD_EXISTING_MODEL=True. Printed: model coefficients, temperature MAE/RMSE, power prediction RMSE.

## Must-Haves

- Both seasonal datasets load and merge to 15-min grid with device-level power, room-level temperature/humidity/CO2, and event features\n- Grey-box thermal model trains separately for heating and cooling with physically plausible coefficients (or room-level fallback activates with documented reason)\n- Device power model learns per-device standby/active power patterns for heating and cooling modes\n- All artifacts saved: thermal_model.joblib, scaler.joblib, feature_columns.json, model_metadata.json\n- Reload path works: LOAD_EXISTING_MODEL=True loads without retraining\n- Temperature MAE and RMSE reported for both seasons on validation split

## Proof Level

- This slice proves: notebook-execution

## Integration Closure

Notebook cells use existing utils.py loaders (load_processed or build_aligned_dataset) adapted for both seasons. New helper functions added to utils.py for thermal model, power model, and artifact save/load. Config dicts (comfort_config, control_config, energy_config) defined at notebook top.

## Verification

- Model coefficients, accuracy metrics (MAE/RMSE), and data quality report printed in notebook output cells.

## Tasks

- [x] **T01: Established and verified the event-based device-control notebook scaffold plus reusable device, room, and event feature builders for both seasonal datasets.** `est:2-3 hours`
  1. Create `backend/notebooks/07_event_based_device_control.ipynb` with markdown header cells and config dicts at the top (`comfort_config`, `control_config`, `energy_config` with `electricity_price_eur_per_kWh: 0.35`, `co2_kg_per_kWh: 0.40`).
  2. Load both seasonal datasets using existing `utils.py` loaders (`load_processed` or `build_aligned_dataset`). Verify the data shape: 15-minute grid, per-device columns present.
  3. Build device-level features: aggregate 5-min `power_draw.csv` to 15-min mean power per device; create wide columns `device_i_active` and `device_i_power_kw` for i=1..4 with configurable activity threshold (`was_adjusting_temperature == 1` OR power > standby baseline).
  4. Build room-level features: median for temperature/return-temp/humidity/CO2 across 4 devices, sum for power/energy.
  5. Build event features from `space_events.csv`: `event_active`, `minutes_to_next_event`, `minutes_since_previous_event`, `next_event_start/end`, `inside_preconditioning_window`.
  6. Add helper functions to `utils.py` as needed (e.g., `build_device_level_features`, `build_event_features`).
  7. Print data quality summary: row counts per season, device counts, event counts, missing value stats.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/notebooks/utils.py`
  - Verify: Run notebook cells through data pipeline section on both seasons; verify device-level and room-level DataFrames have expected columns and no NaN in critical fields. `uv run --project backend python -c "from backend.notebooks.utils import *; print('import ok')"` succeeds.

- [x] **T02: Implemented and verified grey-box thermal model training pipeline with coefficient check, fallback, and validation.** `est:2-3 hours`
  1. Implement the grey-box thermal model: `T_next = a*T_room + b*T_outside + c_heat*total_heating_power_kw - c_cool*total_cooling_power_kw + d*event_active`, trained separately for heating and cooling seasons using scikit-learn LinearRegression or Ridge.
  2. Time-based train/validation split: heating train earlier part of 2026-03-30→04-05, validate later event periods; cooling train earlier part of 2026-05-25→05-31, validate later events ~2026-05-27→05-29. Report exact timestamps.
  3. Implement coefficient stability/plausibility check: verify signs are physically reasonable (a > 0, b > 0, c_heat > 0, c_cool > 0 or near zero). If implausible, activate room-level fallback and log the reason.
  4. Report temperature MAE and RMSE on validation split for both seasons.
  5. Add helper functions to `utils.py`: `train_thermal_model`, `predict_temperature`, `check_coefficient_plausibility`.
  6. StandardScaler fit/transform; save scaler alongside model.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/notebooks/utils.py`
  - Verify: Notebook cells print thermal model coefficients for both seasons with plausibility verdict. Validation MAE < 2°C for both seasons (or documented reason for fallback).

- [x] **T03: Implemented learned device power model, added utility helpers, and verified with notebook and test suite.** `est:1-2 hours`
  1. Implement per-device power model: for each device and mode (heating/cooling), learn the typical power draw when active vs standby. Use simple approach: per-device mean power when active and when standby, grouped by mode, stored as a dict/DataFrame.
  2. The model must predict device power from control decisions (device on/off) without using future measured power_draw_kw — this is the leakage-safe foundation.
  3. Train on the training portion of each season (same split as thermal model).
  4. Report per-device predicted vs actual power RMSE on validation set.
  5. Add helper function to `utils.py`: `train_device_power_model`, `predict_device_power`.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/notebooks/utils.py`
  - Verify: Notebook cells print per-device power model parameters (active/standby power per mode). Predicted vs actual power comparison metrics shown.

- [x] **T04: Implemented model artifact save and reload path with LOAD_EXISTING_MODEL flag and helper functions in utils.py.** `est:1-2 hours`
  1. Implement artifact save: after training, save `thermal_model.joblib`, `scaler.joblib`, `feature_columns.json`, `model_metadata.json` (containing season, train/val timestamps, coefficients, metrics, plausibility verdict) to `backend/artifacts/event_device_control/models/`.
  2. Also save device power model parameters (e.g., `device_power_model.joblib` or as part of metadata).
  3. Implement `LOAD_EXISTING_MODEL = True` flag at notebook top: when True and all required artifact files exist, load from disk without retraining. If any file is missing, retrain and re-save.
  4. Add helper functions to `utils.py`: `save_model_artifacts`, `load_model_artifacts`.
  5. Verify round-trip: train → save → reload → predict produces identical results.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/notebooks/utils.py`
  - Verify: Run notebook with LOAD_EXISTING_MODEL=False (trains and saves), then conceptually verify reload path loads artifacts. Verify files exist: `ls backend/artifacts/event_device_control/models/`.

## Files Likely Touched

- backend/notebooks/07_event_based_device_control.ipynb
- backend/notebooks/utils.py
