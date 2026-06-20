# Requirements

This file is the explicit capability and coverage contract for the project.

## Active

### R001 — Load CSV datasets, align to 15-minute clock, impute missing values, and engineer time/weather/envelope features.
- Class: core-capability
- Status: active
- Description: Load CSV datasets, align to 15-minute clock, impute missing values, and engineer time/weather/envelope features.
- Why it matters: To provide a standardized clean dataset for all downstream models and calculations.
- Source: user
- Primary owning slice: M001-992333/S01
- Validation: mapped

### R002 — Implement ARIMA/SARIMAX models to forecast indoor room temperatures.
- Class: core-capability
- Status: active
- Description: Implement ARIMA/SARIMAX models to forecast indoor room temperatures.
- Why it matters: To establish a baseline statistical forecasting method for temperature.
- Source: user
- Primary owning slice: M001-992333/S02
- Validation: mapped

### R003 — Train LSTMs for base prediction (L1) and correct residuals using weather/occupancy variables (L2).
- Class: core-capability
- Status: active
- Description: Train LSTMs for base prediction (L1) and correct residuals using weather/occupancy variables (L2).
- Why it matters: To demonstrate deep learning time-series forecasting and two-level residual error correction.
- Source: user
- Primary owning slice: M001-992333/S03
- Validation: mapped

### R004 — Calibrate a 2R2C grey-box model and construct a Physics-Informed Neural Network (PINN) in PyTorch.
- Class: core-capability
- Status: active
- Description: Calibrate a 2R2C grey-box model and construct a Physics-Informed Neural Network (PINN) in PyTorch.
- Why it matters: To show how to integrate physical laws (heat equations) with neural network training.
- Source: user
- Primary owning slice: M001-992333/S04
- Validation: mapped

### R005 — Implement Isolation Forest, One-Class SVM, and PyTorch autoencoder to identify sensor faults/alarms.
- Class: core-capability
- Status: active
- Description: Implement Isolation Forest, One-Class SVM, and PyTorch autoencoder to identify sensor faults/alarms.
- Why it matters: To detect anomalies and malfunctions in HVAC sensors and operations.
- Source: user
- Primary owning slice: M001-992333/S05
- Validation: mapped

### R006 — Estimate heating/cooling power draw, calculate occupancy sensible/latent heat gains, and evaluate setpoint setbacks.
- Class: core-capability
- Status: active
- Description: Estimate heating/cooling power draw, calculate occupancy sensible/latent heat gains, and evaluate setpoint setbacks.
- Why it matters: To calculate potential energy savings and optimize HVAC controls under varying schedules.
- Source: user
- Primary owning slice: M001-992333/S06
- Validation: mapped

### R007 — Develop a python script to run all notebooks end-to-end to ensure zero exceptions.
- Class: quality-attribute
- Status: active
- Description: Develop a python script to run all notebooks end-to-end to ensure zero exceptions.
- Why it matters: To guarantee that the entire notebook suite executes correctly without runtime errors.
- Source: inferred
- Primary owning slice: M001-992333/S07
- Validation: mapped

## Validated

## Deferred

## Out of Scope

## Traceability

| ID | Class | Status | Primary owner | Supporting | Proof |
|---|---|---|---|---|---|
| R001 | core-capability | active | M001-992333/S01 | none | mapped |
| R002 | core-capability | active | M001-992333/S02 | none | mapped |
| R003 | core-capability | active | M001-992333/S03 | none | mapped |
| R004 | core-capability | active | M001-992333/S04 | none | mapped |
| R005 | core-capability | active | M001-992333/S05 | none | mapped |
| R006 | core-capability | active | M001-992333/S06 | none | mapped |
| R007 | quality-attribute | active | M001-992333/S07 | none | mapped |

## Coverage Summary

- Active requirements: 7
- Mapped to slices: 7
- Validated: 0
- Unmapped active requirements: 0
