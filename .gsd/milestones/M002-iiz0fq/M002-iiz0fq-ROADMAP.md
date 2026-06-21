# M002-iiz0fq: Event-Based Device-Level Heat Pump Control

**Vision:** Build the capstone control notebook (07_event_based_device_control.ipynb) that decides — given a future event start time — which of four heat pump devices to activate and when to start pre-heating or pre-cooling, so the room reaches comfort by event start. The notebook simulates alternative control decisions, compares smart-control behavior against the measured baseline on both heating and cooling validation data, and quantifies electricity, cost, CO₂, and comfort savings using only learned models (leakage-free).

## Success Criteria

- Notebook 07_event_based_device_control.ipynb executes end-to-end on both heating and cooling seasons with zero exceptions
- Grey-box thermal model trains, saves, and reloads weights/scaler/feature-columns/metadata (LOAD_EXISTING_MODEL=True path works)
- Per-event control-action schedule output with event_id, mode, start_time, device_i_on, target_temp, predicted_temp_at_start, expected_kwh/cost/co2
- Learned device power model used in counterfactual — no future measured power leakage
- Heating and cooling validation plots with measured-baseline vs smart-control room temperature, comfort band, event shading, per-device schedules, cumulative energy
- Per-event and time-series CSV reports saved under backend/artifacts/event_device_control/reports/
- Model artifacts saved under backend/artifacts/event_device_control/models/
- Pytest test executes the notebook end-to-end (mirroring test_notebooks.py pattern)
- Backend lint/type/security/pytest/pre-commit gates pass

## Slices

- [x] **S01: Data Pipeline, Thermal Model, and Device Power Model** `risk:high` `depends:[]`
  > After this: Notebook cells 1–N execute on both heating and cooling seasons: config dicts visible, data loaded and merged to 15-min grid with device-level and room-level features, grey-box thermal model trained with physically plausible coefficients (or room-level fallback activated), device power model trained, all model artifacts saved to backend/artifacts/event_device_control/models/ and successfully reloaded with LOAD_EXISTING_MODEL=True. Printed: model coefficients, temperature MAE/RMSE, power prediction RMSE.

- [ ] **S02: Event-Based Optimizer and Control Schedule** `risk:medium` `depends:[S01]`
  > After this: Notebook cells execute the event-based optimizer on both seasons' validation events: for each event, evaluates candidate start times × device subsets, selects cheapest feasible schedule (or reports smallest comfort violation), and outputs explicit control-action schedule table with event_id, mode, start_time, device_1–4_on, target_temp, predicted_temp_at_start, expected_kwh/cost/co2. Infeasible events flagged transparently.

- [ ] **S03: Baseline vs Smart-Control Comparison, Plots, and CSV Reports** `risk:low` `depends:[S01,S02]`
  > After this: Notebook produces heating and cooling validation plots showing: measured-baseline vs smart-control room temperature with comfort band, event shading with smart-control start times, measured vs simulated total power, per-device on/off schedules, cumulative energy baseline vs smart. Saves per-event and time-series CSV reports plus PNG figures under backend/artifacts/event_device_control/. Reports electricity (kWh), cost (EUR), CO₂ (kg), and comfort metrics (MAE, RMSE, comfort-hit rate, degree-minutes violation).

- [ ] **S04: Test Harness and Backend Quality Gates** `risk:low` `depends:[S01,S02,S03]`
  > After this: pytest test_notebooks.py (extended with 07_event_based_device_control.ipynb) passes; reload-path test passes; backend gates (ruff check, ruff format, mypy, bandit, py_compile, pre-commit) all pass. All notebook helpers in utils.py are typed and lint-clean.

## Boundary Map

```\n## Boundary Map\n\n### Data Layer\n- Input: backend/data/{heating_2026-03-30_to_2026-04-05,cooling_2026-05-25_to_2026-05-31}/*.csv + backend/data/devices.csv\n- Processed: backend/data/processed/{heating,cooling}_processed.csv (from M001 01_preprocessing)\n- Loaders: backend/notebooks/utils.py (load_processed, build_aligned_dataset, build_room_physical_model_frame)\n\n### Model Layer\n- Grey-box thermal model: T_next = a*T_room + b*T_outside + c*power + d*event_active (separate heating/cooling)\n- Device power model: learned standby/active power per device per mode\n- Artifacts: backend/artifacts/event_device_control/models/{thermal_model.joblib, scaler.joblib, feature_columns.json, model_metadata.json}\n\n### Control Layer\n- Event optimizer: candidate start times × device subsets → cheapest feasible schedule\n- Output: control-action schedule per event with device-level decisions\n\n### Output Layer\n- Reports: backend/artifacts/event_device_control/reports/{heating,cooling}_event_control_results.csv, {heating,cooling}_validation_timeseries.csv\n- Figures: backend/artifacts/event_device_control/figures/{heating,cooling}_validation_plot.png\n- Notebook: backend/notebooks/07_event_based_device_control.ipynb\n\n### Test Layer\n- backend/tests/test_notebooks.py (extended with 07 notebook)\n- Backend quality gates: ruff, mypy, bandit, py_compile, pre-commit\n```
