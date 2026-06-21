# S04: Test Harness and Backend Quality Gates — UAT

**Milestone:** M002-iiz0fq
**Written:** 2026-06-21T19:47:10.655Z

## Preconditions
1. Python backend virtual environment initialized.
2. Verified training files and metadata exist under `backend/artifacts/event_device_control/models/`.

## UAT Steps
1. Execute python syntax check on helper files:
   `uv run --project backend python -m compileall backend/notebooks backend/tests`
2. Run ruff linter checks on code style:
   `uv run --project backend ruff check backend`
3. Run unit tests on reporting and leakage controls:
   `PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py`
4. Run notebook execution and reload test paths:
   `PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k "07_event_based_device_control or reload"`

## Expected Outcomes
- Syntax check completes with zero errors.
- Ruff returns 'All checks passed!'.
- `test_event_control_reporting` passes 4/4 tests.
- `test_notebooks` executes and reloads the model artifacts successfully, returning two passed tests.
- Figures and CSV reports are properly stored under `backend/artifacts/event_device_control/`.

## UAT Type
- UAT mode: runtime-executable

