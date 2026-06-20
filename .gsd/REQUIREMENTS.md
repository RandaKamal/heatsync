# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R004 — Calibrate a 2R2C grey-box model and construct a Physics-Informed Neural Network (PINN) in PyTorch.
- Class: core-capability
- Status: active
- Description: Calibrate a 2R2C grey-box model and construct a Physics-Informed Neural Network (PINN) in PyTorch.
- Why it matters: To show how to integrate physical laws (heat equations) with neural network training.
- Source: user
- Primary owning slice: M001/S04
- Validation: mapped

## Validated

### R001 — Load CSV datasets, align to 15-minute clock, impute missing values, and engineer time/weather/envelope features.
- Class: core-capability
- Status: validated
- Description: Load CSV datasets, align to 15-minute clock, impute missing values, and engineer time/weather/envelope features.
- Why it matters: To provide a standardized clean dataset for all downstream models and calculations.
- Source: user
- Primary owning slice: M001/S01
- Validation: Validated in S01: backend/notebooks/utils.py loading, downsampling/alignment, interpolation tracking, weather/time/envelope feature engineering, and notebook execution (backend/notebooks/01_preprocessing.ipynb) passing programmatically via nbconvert with cached processed artifacts in backend/data/processed/.

### R002 — Implement ARIMA/SARIMAX models to forecast indoor room temperatures.
- Class: core-capability
- Status: validated
- Description: Implement ARIMA/SARIMAX models to forecast indoor room temperatures.
- Why it matters: To establish a baseline statistical forecasting method for temperature.
- Source: user
- Primary owning slice: M001/S02
- Validation: Validated via end-to-end nbconvert programmatic execution of backend/notebooks/02_forecasting_sarimax.ipynb producing evaluation metrics (RMSE, MAPE) and plots, alongside passing pytest suite on backend/tests/test_sarimax.py.
- Notes: Validated in S02: backend/notebooks/02_forecasting_sarimax.ipynb execution programmatically with zero exceptions. SARIMAX models forecast indoor room temperatures (both heating and cooling windows) and print evaluation metrics (RMSE and MAPE) and plot forecast-versus-actual charts. Verified via pytest unit tests (backend/tests/test_sarimax.py).

### R003 — Train LSTMs for base prediction (L1) and correct residuals using weather/occupancy variables (L2).
- Class: core-capability
- Status: validated
- Description: Train LSTMs for base prediction (L1) and correct residuals using weather/occupancy variables (L2).
- Why it matters: To demonstrate deep learning time-series forecasting and two-level residual error correction.
- Source: user
- Primary owning slice: M001/S03
- Validation: Validated via end-to-end nbconvert programmatic execution of backend/notebooks/03_forecasting_lstm.ipynb producing base (L1) and residual-corrected (L2) evaluation metrics (RMSE, MAPE) and plots, alongside passing pytest suite on backend/tests/test_lstm.py.
- Notes: Validated in S03: PyTorch LSTM L1 base model and L2 residual correction implemented and evaluated in backend/notebooks/03_forecasting_lstm.ipynb, producing finite positive RMSE and MAPE values for both heating and cooling periods. Verified by tests under backend/tests/test_lstm.py.

### R005 — Implement Isolation Forest, One-Class SVM, and PyTorch autoencoder to identify sensor faults/alarms.
- Class: core-capability
- Status: validated
- Description: Implement Isolation Forest, One-Class SVM, and PyTorch autoencoder to identify sensor faults/alarms.
- Why it matters: To detect anomalies and malfunctions in HVAC sensors and operations.
- Source: user
- Primary owning slice: M001/S05
- Validation: Validated via end-to-end nbconvert execution of backend/notebooks/05_anomaly_detection.ipynb and passing pytest suite on backend/tests/test_anomaly.py.
- Notes: Validated in S05: Implemented Isolation Forest, One-Class SVM, and PyTorch Autoencoder detectors in backend/notebooks/05_anomaly_detection.ipynb. Generated a ranked shortlist of anomaly candidates using a combined normalized score and vote count, integrated with Modbus error register alarm flags. Verified via pytest suite in backend/tests/test_anomaly.py covering all models and notebook programmatic execution.

### R006 — Estimate heating/cooling power draw, calculate occupancy sensible/latent heat gains, and evaluate setpoint setbacks.
- Class: core-capability
- Status: validated
- Description: Estimate heating/cooling power draw, calculate occupancy sensible/latent heat gains, and evaluate setpoint setbacks.
- Why it matters: To calculate potential energy savings and optimize HVAC controls under varying schedules.
- Source: user
- Primary owning slice: M001/S06
- Validation: Validated via programmatic nbconvert execution of 06_energy_controls.ipynb and pytest test suite on backend/tests/test_energy.py verifying comfort constraints, occupancy schedules, sensible/latent heat gains, 2R2C thermostat control loops, and scenario-based HVAC kWh savings.
- Notes: Estimated heating/cooling power draw, occupancy sensible/latent heat gains, and setback strategies validated through backend/notebooks/06_energy_controls.ipynb programmatic execution and backend/tests/test_energy.py tests.

### R007 — Develop a python script to run all notebooks end-to-end to ensure zero exceptions.
- Class: quality-attribute
- Status: validated
- Description: Develop a python script to run all notebooks end-to-end to ensure zero exceptions.
- Why it matters: To guarantee that the entire notebook suite executes correctly without runtime errors.
- Source: inferred
- Primary owning slice: M001/S07
- Validation: Verified end-to-end notebook execution via pytest in backend/tests/test_notebooks.py. All 6 notebooks executed programmatically and passed with zero uncaught exceptions in 65s.
- Notes: Validated in S07: Developed backend/tests/test_notebooks.py running all 6 notebooks end-to-end programmatically via ExecutePreprocessor. Verified via pytest exiting with 0.

## Deferred

## Out of Scope

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | validated | M001/S01 | none | Validated in S01: backend/notebooks/utils.py loading, downsampling/alignment, interpolation tracking, weather/time/envelope feature engineering, and notebook execution (backend/notebooks/01_preprocessing.ipynb) passing programmatically via nbconvert with cached processed artifacts in backend/data/processed/. |
| R002 | core-capability | validated | M001/S02 | none | Validated via end-to-end nbconvert programmatic execution of backend/notebooks/02_forecasting_sarimax.ipynb producing evaluation metrics (RMSE, MAPE) and plots, alongside passing pytest suite on backend/tests/test_sarimax.py. |
| R003 | core-capability | validated | M001/S03 | none | Validated via end-to-end nbconvert programmatic execution of backend/notebooks/03_forecasting_lstm.ipynb producing base (L1) and residual-corrected (L2) evaluation metrics (RMSE, MAPE) and plots, alongside passing pytest suite on backend/tests/test_lstm.py. |
| R004 | core-capability | active | M001/S04 | none | mapped |
| R005 | core-capability | validated | M001/S05 | none | Validated via end-to-end nbconvert execution of backend/notebooks/05_anomaly_detection.ipynb and passing pytest suite on backend/tests/test_anomaly.py. |
| R006 | core-capability | validated | M001/S06 | none | Validated via programmatic nbconvert execution of 06_energy_controls.ipynb and pytest test suite on backend/tests/test_energy.py verifying comfort constraints, occupancy schedules, sensible/latent heat gains, 2R2C thermostat control loops, and scenario-based HVAC kWh savings. |
| R007 | quality-attribute | validated | M001/S07 | none | Verified end-to-end notebook execution via pytest in backend/tests/test_notebooks.py. All 6 notebooks executed programmatically and passed with zero uncaught exceptions in 65s. |

## Coverage Summary

- Active requirements: 1
- Mapped to slices: 1
- Validated: 6 (R001, R002, R003, R005, R006, R007)
- Unmapped active requirements: 0
