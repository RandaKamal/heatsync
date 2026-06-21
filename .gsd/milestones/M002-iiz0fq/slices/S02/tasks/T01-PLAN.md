---
estimated_steps: 14
estimated_files: 2
skills_used: []
---

# T01: Added optimizer contracts, validation logic, device column discovery, and event-window consolidation utility functions with extensive unit test coverage

---
skills_used:
  - design-an-interface
  - decompose-into-slices
  - verify-before-complete
---
Why: S02 needs a stable, testable interface between the notebook and optimizer before candidate simulation is added. Event data includes duplicate, overlapping, and close back-to-back windows, so the controller must optimize shared comfort windows while preserving per-event output rows.

Do: In `backend/notebooks/utils.py`, add small typed contracts or dictionaries for event-control configuration and schedule rows, helper validation for mode and comfort bands, deterministic device-column discovery for four devices, event extraction from existing processed/aligned frames, and event-window consolidation that merges overlapping or close windows using a visible threshold. Keep helpers notebook-friendly and avoid adding application code outside `backend/`. In `backend/tests/test_utils.py`, add deterministic tests for duplicate events, overlapping events, close back-to-back merging, separated events, missing timestamp/event columns, and deterministic device ordering.

Q3 Threat Surface: Low. Inputs are local CSV-derived DataFrames; validate required columns and reject invalid modes/configs rather than silently producing schedules.
Q4 Requirement Impact: No active requirement is owned by S02; this task supports the M002 control capability and consumes already validated R001 data-alignment behavior.
Q5 Failure Modes: Duplicate full-day events, missing event identifiers, non-datetime timestamps, empty validation windows, and invalid merge thresholds must fail transparently or produce empty schedule-ready windows.
Q6 Load Profile: Validation data is one week at 15-minute granularity with at most dozens of events; simple DataFrame grouping is sufficient.
Q7 Negative Tests: Invalid mode, missing columns, and negative merge threshold.

Done when: The event-window consolidation API is documented by tests, returns deterministic window records with preserved event IDs, and is ready for the simulator to consume.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
- `backend/data/processed/heating_processed.csv`
- `backend/data/processed/cooling_processed.csv`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`

## Verification

uv run --project backend pytest backend/tests/test_utils.py -k event_consolidation

## Observability Impact

Defines rationale/status fields that later notebook cells can display for each consolidated comfort window.
