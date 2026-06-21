---
estimated_steps: 12
estimated_files: 3
skills_used: []
---

# T05: Run S02 integration verification

---
skills_used:
  - verify-before-complete
---
Why: Before S02 is completed, the executor needs fresh proof that utility contracts and notebook integration work together under the backend uv environment.

Do: Run the targeted event-control utility tests and the 07 notebook execution test after T01 through T04 are complete. If failures expose plan-invalidating issues, replan rather than marking the task complete. Do not broaden into S03 plotting/report comparisons or S04 full pre-commit gates.

Q3 Threat Surface: Verification-only task; no new surface.
Q4 Requirement Impact: Confirms S02 milestone criteria only.
Q5 Failure Modes: Notebook execution failures, missing report CSVs, schema drift between utilities and notebook, and import path issues.
Q6 Load Profile: Test execution is local and bounded to targeted utility tests plus one notebook.
Q7 Negative Tests: Covered by the utility test selectors planned in T01 through T03.

Done when: Fresh verification evidence shows targeted event-control utility tests, notebook execution, and Python compile for the touched utility module pass.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
- `backend/notebooks/07_event_based_device_control.ipynb`

## Verification

uv run --project backend python -m py_compile backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py backend/tests/test_notebooks.py -k event

## Observability Impact

Produces command-level verification evidence for the slice summary without adding runtime telemetry.
