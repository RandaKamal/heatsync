# Project

## What This Is

HeatSync backend contains data parsing, analytical modelling, anomaly detection, physical Grey-box and PINN modeling, and control optimization scripts for an unoccupied and occupied room with heat pump snapshots. We are creating a Jupyter notebook suite under `backend/notebooks/` with a shared helper module `backend/notebooks/utils.py` to illustrate these modeling, forecasting, anomaly detection, and energy optimization approaches.

## Core Value

Demonstrate and validate temperature forecasting, anomaly detection, and occupancy-based control optimization algorithms on actual Heat Pump data.

## Project Shape

- **Complexity:** complex
- **Why:** The project requires a mix of statistical modeling (SARIMAX), machine learning (LSTM), physical model fitting (2R2C Grey-box via scipy.optimize), PINNs (Physics-Informed Neural Networks), multi-model anomaly detection, occupancy energy estimation, and event-based/device-level smart control optimization under multi-layered physical and thermodynamic constraints.

## Architecture / Key Patterns

- Notebooks saved in `backend/notebooks/`.
- Shared utility functions saved in `backend/notebooks/utils.py`.
- Models: SARIMAX, PyTorch LSTM, 2R2C Grey-box (via scipy.optimize), PINN, Isolation Forest, Autoencoder.

## Capability Contract

See `.gsd/REQUIREMENTS.md` for the explicit capability contract, requirement status, and coverage mapping.

## Milestone Sequence

- [x] M001: M001: M001: M001: HeatSync Modeling and Controls Notebooks — Create a comprehensive set of Jupyter notebooks under backend/notebooks/ with a shared helper module backend/notebooks/utils.py illustrating data preprocessing, forecasting, grey-box/PINN modeling, anomaly detection, and energy controls on actual Heat Pump data.
- [ ] M002-iiz0fq: New milestone M002-iiz0fq — Planned.
