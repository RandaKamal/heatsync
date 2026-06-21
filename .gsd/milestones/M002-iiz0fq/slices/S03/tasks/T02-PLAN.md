---
estimated_steps: 14
estimated_files: 7
skills_used: []
---

# T02: Notebook Reports Figures and Executive Recap

---
skills_used:
  - write-docs
  - verify-before-complete
---
Why: The capstone evidence must be generated from the notebook itself so judges and S04 tests can reproduce the same baseline-vs-smart-control story end to end.

Do:
- Extend `backend/notebooks/07_event_based_device_control.ipynb` after the S02 schedule cells to call the new comparison helpers for heating and cooling.
- Ensure `backend/artifacts/event_device_control/reports/` and `backend/artifacts/event_device_control/figures/` are created as needed.
- Overwrite or regenerate `heating_event_control_results.csv` and `cooling_event_control_results.csv` with augmented per-event comparison metrics while preserving S02 schedule columns.
- Save `heating_validation_timeseries.csv` and `cooling_validation_timeseries.csv` under `backend/artifacts/event_device_control/reports/`.
- Save one single-narrative PNG per season under `backend/artifacts/event_device_control/figures/` showing temperature comparison with comfort band and event shading, measured vs simulated total power, per-device schedules, and cumulative energy.
- Add an executive recap notebook section with compact heating/cooling savings and comfort tables, saved artifact paths, and explicit edge-case counts for infeasible, comfort-missed, neutral, or negative-savings events.

Done when: notebook execution through pytest succeeds and writes all required reports and figures for both seasons.

## Inputs

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/heating_processed.csv`
- `backend/data/processed/cooling_processed.csv`
- `backend/artifacts/event_device_control/models/heating_thermal_model.joblib`
- `backend/artifacts/event_device_control/models/heating_device_power_model.joblib`
- `backend/artifacts/event_device_control/models/cooling_thermal_model.joblib`
- `backend/artifacts/event_device_control/models/cooling_device_power_model.joblib`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`

## Expected Output

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv`
- `backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv`
- `backend/artifacts/event_device_control/figures/heating_validation_plot.png`
- `backend/artifacts/event_device_control/figures/cooling_validation_plot.png`

## Verification

PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb

## Observability Impact

Produces the primary judge-facing observability surfaces: CSV reports, PNG figures, and recap outputs listing paths and edge-case counts.
