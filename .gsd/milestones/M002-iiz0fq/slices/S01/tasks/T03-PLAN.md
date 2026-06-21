---
estimated_steps: 5
estimated_files: 2
skills_used: []
---

# T03: Implemented learned device power model, added utility helpers, and verified with notebook and test suite.

1. Implement per-device power model: for each device and mode (heating/cooling), learn the typical power draw when active vs standby. Use simple approach: per-device mean power when active and when standby, grouped by mode, stored as a dict/DataFrame.
2. The model must predict device power from control decisions (device on/off) without using future measured power_draw_kw — this is the leakage-safe foundation.
3. Train on the training portion of each season (same split as thermal model).
4. Report per-device predicted vs actual power RMSE on validation set.
5. Add helper function to `utils.py`: `train_device_power_model`, `predict_device_power`.

## Inputs

- `backend/notebooks/07_event_based_device_control.ipynb`

## Expected Output

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/notebooks/utils.py`

## Verification

Notebook cells print per-device power model parameters (active/standby power per mode). Predicted vs actual power comparison metrics shown.
