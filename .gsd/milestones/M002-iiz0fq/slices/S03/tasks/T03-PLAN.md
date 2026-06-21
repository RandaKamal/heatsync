---
estimated_steps: 11
estimated_files: 3
skills_used: []
---

# T03: Verified slice-level reporting contracts and successfully executed the event-control notebooks to regenerate validation artifacts.

---
skills_used:
  - verify-before-complete
---
Why: Before handing off to S04, S03 needs a final executable proof that the helper contracts and notebook-generated artifacts agree with the planned slice outputs.

Do:
- Re-run the focused event-control reporting tests after notebook integration.
- Re-run notebook execution for `07_event_based_device_control.ipynb` to regenerate reports and figures from a clean kernel path.
- Compile touched backend Python modules and tests to catch syntax/import regressions before completion.
- If this verification exposes a missing required column, missing figure/report, leakage regression, or hidden edge case, fix the relevant T01/T02 implementation before marking the task complete.

Done when: all listed verification commands pass in the backend uv environment and no additional S03 deliverables are missing.

## Inputs

- `backend/notebooks/utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/tests/test_event_control_reporting.py`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv`
- `backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv`
- `backend/artifacts/event_device_control/figures/heating_validation_plot.png`
- `backend/artifacts/event_device_control/figures/cooling_validation_plot.png`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/tests/test_event_control_reporting.py`

## Verification

PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py && PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb && PYTHONPATH=. uv run --project backend python -m compileall backend/notebooks backend/tests

## Observability Impact

Confirms all S03 observability artifacts and contracts are reproducible immediately before slice completion.
