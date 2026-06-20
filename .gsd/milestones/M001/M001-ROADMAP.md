# M001: HeatSync Modeling and Controls Notebooks

**Vision:** Create a comprehensive set of Jupyter notebooks under backend/notebooks/ with a shared helper module backend/notebooks/utils.py illustrating data preprocessing, forecasting, grey-box/PINN modeling, anomaly detection, and energy controls on actual Heat Pump data.

## Success Criteria

- All 6 Jupyter notebooks run end-to-end programmatically with zero exceptions.
- Model forecasting metrics (RMSE, MAPE) are generated and logged for SARIMAX and LSTM models.
- 2R2C Grey-box model calibration converges to valid positive physical parameters (R > 0, C > 0).
- Anomaly detection models flag real sensor anomalies and Modbus alarm registers.
- Control setback scenarios estimate HVAC kWh energy savings.
- Automated test script runs all notebooks without raising errors.

## Slices

- [x] **S01: Data Preprocessing and Shared Utilities** `risk:low` `depends:[]`
  > After this: Reads raw CSVs from backend/data/ and outputs normalized 15-min aligned dataframes via utils.py; 01_preprocessing.ipynb renders clean output cells.

- [x] **S02: Statistical Temperature Forecasting (SARIMAX)** `risk:low` `depends:[S01]`
  > After this: Runs 02_forecasting_sarimax.ipynb showing SARIMAX temperature forecast with RMSE and MAPE metrics logged in output cells.

- [x] **S03: LSTM and Two-Level Forecasting Models** `risk:medium` `depends:[S01]`
  > After this: Runs 03_forecasting_lstm.ipynb showing PyTorch LSTM base predictions and L2 residual correction with metrics.

- [ ] **S04: Physical Grey-Box and PINN Models** `[sketch]` `risk:high` `depends:[S01]`
  > After this: Runs 04_physical_modeling.ipynb showing 2R2C calibration with positive R/C values and PINN training convergence.

- [ ] **S05: Anomaly Detection Models** `[sketch]` `risk:medium` `depends:[S01]`
  > After this: Runs 05_anomaly_detection.ipynb listing flagged anomaly timestamps from Isolation Forest, One-Class SVM, and Autoencoder.

- [ ] **S06: Energy Controls and Savings Optimization** `[sketch]` `risk:medium` `depends:[S01,S04]`
  > After this: Runs 06_energy_controls.ipynb showing occupancy heat gains, comfort setpoints, and estimated HVAC kWh savings from setback strategies.

- [ ] **S07: Automated Notebook Suite Verification** `[sketch]` `risk:low` `depends:[S02,S03,S04,S05,S06]`
  > After this: Runs backend/tests/test_notebooks.py executing all 6 notebooks programmatically with zero exceptions.

## Boundary Map

| Boundary | Produces | Consumes |\n|----------|----------|----------|\n| backend/data/ (raw CSVs) | — | S01 reads raw snap/interval/power files |\n| backend/notebooks/utils.py | Shared loading, alignment, feature functions | All notebooks S01-S06 |\n| backend/notebooks/01-06 | Model outputs, metrics, charts | utils.py, backend/data/ |\n| backend/tests/test_notebooks.py | Pass/fail test results | All 6 notebooks |
