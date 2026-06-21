---
estimated_steps: 13
estimated_files: 3
skills_used: []
---

# T04: Wired the S02 event-control optimizer into notebook 07 and persisted heating and cooling selected schedule CSV reports.

---
skills_used:
  - write-docs
  - verify-before-complete
---
Why: The capstone notebook must demonstrate the event-based optimizer on both seasons using S01 artifacts and produce schedule outputs where downstream S03 expects them.

Do: Update `backend/notebooks/07_event_based_device_control.ipynb` to import the new optimizer helpers, expand the visible top-level `comfort_config`, `control_config`, and `energy_config` with S02 defaults, split each season to validation events consistently with the existing S01 split timestamps, run the optimizer for heating and cooling using loaded or freshly trained thermal and device-power artifacts, display required schedule columns and compact top-candidate/debug summaries, and save selected schedule CSVs to `backend/artifacts/event_device_control/reports/heating_event_control_results.csv` and `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`. Preserve the existing `LOAD_EXISTING_MODEL=True` path and avoid S03 plots/time-series comparisons.

Q3 Threat Surface: Low. Notebook writes only deterministic local CSV reports inside the backend artifact directory.
Q4 Requirement Impact: Produces the S02 deliverable that supports later S03 reports; no active requirement status change.
Q5 Failure Modes: Missing model artifacts, reload path divergence, empty validation events, infeasible events, and stale report directories.
Q6 Load Profile: Notebook execution should remain bounded to one week each for heating and cooling and configured candidate counts.
Q7 Negative Tests: Covered by utility tests; notebook should visibly report infeasible rows rather than raising.

Done when: Executing the 07 notebook runs optimizer cells for both seasons, shows judge-readable schedules, and writes both selected schedule CSVs.

## Inputs

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/notebooks/utils.py`
- `backend/artifacts/event_device_control/models/heating_thermal_model.joblib`
- `backend/artifacts/event_device_control/models/heating_scaler.joblib`
- `backend/artifacts/event_device_control/models/heating_feature_columns.json`
- `backend/artifacts/event_device_control/models/heating_model_metadata.json`
- `backend/artifacts/event_device_control/models/heating_device_power_model.joblib`
- `backend/artifacts/event_device_control/models/cooling_thermal_model.joblib`
- `backend/artifacts/event_device_control/models/cooling_scaler.joblib`
- `backend/artifacts/event_device_control/models/cooling_feature_columns.json`
- `backend/artifacts/event_device_control/models/cooling_model_metadata.json`
- `backend/artifacts/event_device_control/models/cooling_device_power_model.joblib`
- `backend/data/processed/heating_processed.csv`
- `backend/data/processed/cooling_processed.csv`

## Expected Output

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`

## Verification

uv run --project backend pytest backend/tests/test_notebooks.py -k event_based_device_control

## Observability Impact

Notebook displays selected schedule tables and compact top-candidate diagnostics for both seasons.
