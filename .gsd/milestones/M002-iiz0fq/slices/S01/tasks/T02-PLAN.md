---
estimated_steps: 6
estimated_files: 2
skills_used: []
---

# T02: Grey-box thermal model training and validation

1. Implement the grey-box thermal model: `T_next = a*T_room + b*T_outside + c_heat*total_heating_power_kw - c_cool*total_cooling_power_kw + d*event_active`, trained separately for heating and cooling seasons using scikit-learn LinearRegression or Ridge.
2. Time-based train/validation split: heating train earlier part of 2026-03-30→04-05, validate later event periods; cooling train earlier part of 2026-05-25→05-31, validate later events ~2026-05-27→05-29. Report exact timestamps.
3. Implement coefficient stability/plausibility check: verify signs are physically reasonable (a > 0, b > 0, c_heat > 0, c_cool > 0 or near zero). If implausible, activate room-level fallback and log the reason.
4. Report temperature MAE and RMSE on validation split for both seasons.
5. Add helper functions to `utils.py`: `train_thermal_model`, `predict_temperature`, `check_coefficient_plausibility`.
6. StandardScaler fit/transform; save scaler alongside model.

## Inputs

- `backend/notebooks/07_event_based_device_control.ipynb`

## Expected Output

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/notebooks/utils.py`

## Verification

Notebook cells print thermal model coefficients for both seasons with plausibility verdict. Validation MAE < 2°C for both seasons (or documented reason for fallback).
