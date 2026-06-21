# S01: Data Pipeline, Thermal Model, and Device Power Model — UAT

**Milestone:** M002-iiz0fq
**Written:** 2026-06-21T04:27:38.396Z

# UAT Specification for Slice S01

## UAT-01: End-to-End Notebook Execution and Output Verification
### Preconditions
- The raw datasets for heating (`backend/data/heating_2026-03-30_to_2026-04-05`) and cooling (`backend/data/cooling_2026-05-25_to_2026-05-31`) are present on disk.
- Artifacts directory `backend/artifacts/event_device_control/models/` is clean or exists.

### Steps
1. Execute the notebook `07_event_based_device_control.ipynb` end-to-end.
2. Verify that cells load the data, pivot to device-level wide features, train thermal and power models, and write model files to disk.
3. Reload artifacts using `LOAD_EXISTING_MODEL = True` and perform a forward prediction.

### Expected Outcomes
- Notebook runs without any exception.
- Validation metrics print:
  - Heating Validation MAE: ~0.121°C, RMSE: ~0.153°C
  - Cooling Validation MAE: ~0.092°C, RMSE: ~0.165°C
  - Device validation power RMSE values are within reasonable limits (~13.1 kW, ~2.7 kW, ~2.6 kW, ~3.2 kW for heating; ~1.2 kW, ~0.7 kW, ~0.6 kW, ~1.2 kW for cooling).
- All expected artifact files are present in `backend/artifacts/event_device_control/models/`.

## UAT-02: Unit Tests Execution
### Preconditions
- The pytest testing environment is set up.

### Steps
1. Run `PYTHONPATH=. pytest backend/tests/test_utils.py` and `pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb`.

### Expected Outcomes
- Both test suites pass completely.

