# S02: Event-Based Optimizer and Control Schedule

**Goal:** Implement the event-based optimizer for both heating and cooling validation events, using learned thermal and device-power models to select feasible, low-cost preconditioning schedules and emit explicit per-event control-action schedules for S03.
**Demo:** Notebook cells execute the event-based optimizer on both seasons' validation events: for each event, evaluates candidate start times × device subsets, selects cheapest feasible schedule (or reports smallest comfort violation), and outputs explicit control-action schedule table with event_id, mode, start_time, device_1–4_on, target_temp, predicted_temp_at_start, expected_kwh/cost/co2. Infeasible events flagged transparently.

## Must-Haves

- Top-of-notebook control, comfort, and energy configuration includes visible optimizer defaults for candidate start offsets, max simultaneous devices, min duration/step behavior, close-event merge threshold, electricity price, and CO2 factor.
- `backend/notebooks/utils.py` exposes reusable event-control helpers for event consolidation, candidate generation, learned-power counterfactual simulation, candidate scoring, winner selection, schedule formatting, and optional schedule CSV persistence.
- Optimizer evaluates validation events for both seasons at 15-minute resolution using season-derived modes: heating events use `heating`, cooling events use `cooling`.
- For each event or merged comfort window, candidates cover configured start offsets and all valid device subsets subject to max-device constraints; no future measured `power_draw_kw` is used in smart-control energy or thermal simulation.
- Selection priority is implemented and tested: feasible comfort-band candidates first, then lowest expected cost/energy/CO2, then latest feasible start time, then deterministic simpler device choices.
- Infeasible events are still emitted with clear status, comfort-violation fields, and a rationale explaining that the least-violating candidate was selected.
- Notebook displays judge-readable heating and cooling schedule tables plus compact candidate/debug summaries, and writes selected schedule CSVs to `backend/artifacts/event_device_control/reports/heating_event_control_results.csv` and `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`.
- Targeted utility tests and the 07 notebook execution test pass through the backend uv project.

## Proof Level

- This slice proves: Executable integration proof. Unit tests must exercise event consolidation, candidate simulation, optimizer selection, infeasible fallback, deterministic tie-breaks, and negative validation. Notebook execution must prove the optimizer wires into S01 artifacts and processed data for both seasons without exceptions.

## Integration Closure

S02 closes by producing in-notebook and persisted selected event-control schedule tables that S03 can consume directly for baseline-vs-smart time-series simulation, plots, and final CSV reports. S01 model artifact loading remains intact, and downstream S03/S04 roadmap items remain unchanged.

## Verification

- Adds notebook-visible optimizer diagnostics: selected schedule rows, feasibility status, comfort violation, candidate start offset, active device count, selection reason, and compact top-candidate views. No runtime service telemetry is introduced.

## Tasks

- [x] **T01: Added optimizer contracts, validation logic, device column discovery, and event-window consolidation utility functions with extensive unit test coverage** `est:0.5 day`
  ---
  skills_used:
    - design-an-interface
    - decompose-into-slices
    - verify-before-complete
  ---
  Why: S02 needs a stable, testable interface between the notebook and optimizer before candidate simulation is added. Event data includes duplicate, overlapping, and close back-to-back windows, so the controller must optimize shared comfort windows while preserving per-event output rows.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_utils.py`
  - Verify: uv run --project backend pytest backend/tests/test_utils.py -k event_consolidation

- [x] **T02: Implemented learned-power candidate simulation for preconditioning events using learned thermal and device models.** `est:0.75 day`
  ---
  skills_used:
    - design-an-interface
    - verify-before-complete
  ---
  Why: The optimizer must evaluate counterfactual preconditioning schedules using learned thermal and device-power models, not future measured power, so feasibility and energy estimates are leakage-free.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_utils.py`
  - Verify: uv run --project backend pytest backend/tests/test_utils.py -k event_candidate

- [x] **T03: Added event-control schedule selection, per-event schedule formatting, compact diagnostics, and scoped CSV report persistence for optimizer outputs.** `est:0.75 day`
  ---
  skills_used:
    - verify-before-complete
    - write-docs
  ---
  Why: S02's user-visible deliverable is not raw candidates; it is a clear control-action schedule per event with feasibility and rationale fields that S03 can reuse.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_utils.py`
  - Verify: uv run --project backend pytest backend/tests/test_utils.py -k event_optimizer

- [x] **T04: Wired the S02 event-control optimizer into notebook 07 and persisted heating and cooling selected schedule CSV reports.** `est:0.5 day`
  ---
  skills_used:
    - write-docs
    - verify-before-complete
  ---
  Why: The capstone notebook must demonstrate the event-based optimizer on both seasons using S01 artifacts and produce schedule outputs where downstream S03 expects them.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`, `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`
  - Verify: uv run --project backend pytest backend/tests/test_notebooks.py -k event_based_device_control

- [x] **T05: Ran S02 integration verification for the event-control utilities and notebook integration under the backend uv environment.** `est:0.25 day`
  ---
  skills_used:
    - verify-before-complete
  ---
  Why: Before S02 is completed, the executor needs fresh proof that utility contracts and notebook integration work together under the backend uv environment.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_utils.py`, `backend/notebooks/07_event_based_device_control.ipynb`
  - Verify: uv run --project backend python -m py_compile backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py backend/tests/test_notebooks.py -k event

## Files Likely Touched

- backend/notebooks/utils.py
- backend/tests/test_utils.py
- backend/notebooks/07_event_based_device_control.ipynb
- backend/artifacts/event_device_control/reports/heating_event_control_results.csv
- backend/artifacts/event_device_control/reports/cooling_event_control_results.csv
