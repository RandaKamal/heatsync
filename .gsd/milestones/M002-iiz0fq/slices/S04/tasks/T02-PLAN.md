---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T02: Implemented and verified output artifact contracts and data leakage guards in tests.

Add robust verification for output artifacts and no-leakage behavior in the reload test. Check that the expected CSV reports and model joblib files exist. Also add a helper logic test in `backend/tests/test_event_control_reporting.py` (or a dedicated new test) that explicitly mocks `power_draw_kw` of future times to NaN or raises an exception if accessed during the prediction phase, verifying the event-based control is leakage-free.

## Inputs

- `backend/tests/test_event_control_reporting.py`
- `backend/tests/test_notebooks.py`

## Expected Output

- `backend/tests/test_event_control_reporting.py`

## Verification

PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py backend/tests/test_notebooks.py
