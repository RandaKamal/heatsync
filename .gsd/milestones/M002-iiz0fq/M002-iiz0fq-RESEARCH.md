# M002-iiz0fq Research Summary: Event-Based Device-Level Heat Pump Control

## Context and Findings

We are tasked with designing and implementing `backend/notebooks/07_event_based_device_control.ipynb`, which acts as the capstone control notebook for HeatSync.

### 1. Existing Codebase Utilities & Patterns
- **Data Loaders and Processed Files:**
  - `backend/data/processed/heating_processed.csv` and `cooling_processed.csv` are already generated via `backend/notebooks/01_preprocessing.ipynb`. They contain 15-minute resampled and aligned interval data, snapshots, and event data.
  - `backend/notebooks/utils.py` contains:
    - `load_processed(window)`: Loads the preprocessed CSV.
    - `build_room_physical_model_frame(df, dt_seconds, cop)`: Groups per-device interval/snapshot data into a single room-level frame.
  - The raw files exist in seasonal subfolders under `backend/data/` (e.g. `heating_2026-03-30_to_2026-04-05` and `cooling_2026-05-25_to_2026-05-31`), containing:
    - `heat_pump_snapshots.csv`
    - `heat_pump_intervals.csv`
    - `power_draw.csv`
    - `space_events.csv`
  - The devices.csv is located at `backend/data/devices.csv`.

### 2. Controller & Simulation Requirements
- **Control Strategy:**
  - Given a future event start time, choose the optimal preconditioning start time $t_{start} \in \{0, 15, 30, 45, 60, 90, 120, 180\}$ minutes before the event.
  - Select the optimal device combination (device subset choice, 16 subsets).
  - Use the "cheapest feasible, else smallest comfort violation" rule.
- **Leakage-Safe Simulation:**
  - The counterfactual simulation must use a *learned* or *predicted* device power model rather than measured future power. We will train a simple model (such as a multi-linear or decision tree regressor, or simply average active power per device per mode) to map control input (heating/cooling mode and device active status) to device electrical power.
- **Thermal Model:**
  - Calibrate separate room-level physical models for heating and cooling seasons. The form is a lumped grey-box 2R2C model or a simplified shared-coefficient grey-box thermal model:
    $$T_{room}(t+1) = T_{room}(t) + a \cdot (T_{out}(t) - T_{room}(t)) + \sum_{i=1}^4 c_i \cdot Q_{electric,i}(t) \pm d \cdot \text{event\_active}(t)$$
  - Or the standard 2R2C room model:
    $$\frac{dT_{in}}{dt} = \frac{T_{wall} - T_{in}}{R_{in} C_{in}} + \frac{Q_{hvac} + Q_{occ}}{C_{in}}$$
    $$\frac{dT_{wall}}{dt} = \frac{T_{in} - T_{wall}}{R_{in} C_{wall}} + \frac{T_{out} - T_{wall}}{R_{out} C_{wall}}$$
  - The grey-box physical parameters (e.g. R, C coefficients) will be fitted using scipy optimizer (L-BFGS-B with multi-start) on training splits, saved to a JSON metadata file (`backend/artifacts/models/event_device_control/model_metadata.json`), and reloaded when `LOAD_EXISTING_MODEL = True` to support retraining-free execution.

## Proposed Plan Slices

### Slice 1: Reusable Physical Thermal Model and Preprocessing Setup
- Load the processed datasets using the existing `utils.py` / `loader.py`.
- Formulate the room-level physical thermal model for both heating and cooling.
- Train the thermal models and save their optimized parameters, feature columns, and validation performance to `backend/artifacts/models/event_device_control/model_metadata.json`.
- Implement model saving and reloading logic, verifying reloading works correctly.

### Slice 2: Device-Level Power Predictor and Event Features
- Compute event features: `event_active`, `minutes_to_next_event`, `minutes_since_previous_event`, `next_event_start`, `next_event_end`, and `inside_preconditioning_window`.
- Fit a device-level power model (from device-level active states to power draw kW) to act as a leakage-safe power predictor during simulated smart runs.
- Integrate the power predictor and event features into a clean time-series simulation dataframe.

### Slice 3: Event-Based Device-Level Optimizer and Simulation Loop
- Implement the schedule search optimizer checking 16 device subsets and $\{0, 15, 30, 45, 60, 90, 120, 180\}$ min start offsets before each event.
- Implement switching rules: minimum on/off time, maximum simultaneous active devices.
- Run the simulation loop over the validation splits for both heating and cooling seasons, generating baseline vs smart control comparison.

### Slice 4: Visualizations, CSV Reports, and Verification
- Output CSV reports:
  - `backend/artifacts/reports/event_device_control/heating_event_control_results.csv`
  - `backend/artifacts/reports/event_device_control/cooling_event_control_results.csv`
  - `backend/artifacts/reports/event_device_control/heating_validation_timeseries.csv`
  - `backend/artifacts/reports/event_device_control/cooling_validation_timeseries.csv`
- Save PNG plots comparing baseline room temp vs smart room temp, comfort bounds, event schedules, power, and cumulative energy consumption.
- Register tests in `backend/tests/` to run the capstone notebook end-to-end and execute backend verification checks.

## Critical Risks & Constraints
1. **Power Leakage:** We must predict device power consumption using our learned power model based only on the control inputs (active vs inactive), never using the future actual measured power draw within the optimizer or temperature simulator.
2. **Re-loadability:** The `LOAD_EXISTING_MODEL` flag must work flawlessly. The code must look for the metadata json first, reload parameter values/scalers, and skip fitting steps if files exist.
3. **UTC/Local Timestamp Alignment:** Different data tables might have mismatching timestamp fields or time zones. The loader and utils must align them cleanly to UTC.
