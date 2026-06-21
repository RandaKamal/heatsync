---
estimated_steps: 13
estimated_files: 2
skills_used: []
---

# T03: Added event-control schedule selection, per-event schedule formatting, compact diagnostics, and scoped CSV report persistence for optimizer outputs.

---
skills_used:
  - verify-before-complete
  - write-docs
---
Why: S02's user-visible deliverable is not raw candidates; it is a clear control-action schedule per event with feasibility and rationale fields that S03 can reuse.

Do: Add optimizer orchestration in `backend/notebooks/utils.py` that loops over consolidated validation event windows, evaluates all candidates from T02, selects the winning candidate by the priority order feasible first, then lowest expected cost/energy/CO2, then latest start, then deterministic simpler device choices, and expands merged-window decisions back into per-event schedule rows. Implement schedule formatting with required columns `event_id`, `mode`, `start_time`, `device_1_on`, `device_2_on`, `device_3_on`, `device_4_on`, `target_temp`, `predicted_temp_at_start`, `expected_kwh`, `expected_cost`, and `expected_co2`, plus readable status/rationale fields such as `feasible`, `selection_reason`, `comfort_violation_c`, `candidate_start_offset_minutes`, and `active_device_count`. Add helper persistence for selected schedules under `backend/artifacts/event_device_control/reports/` without requiring full candidate CSVs. Extend tests for feasible selection, infeasible fallback, tie-break ordering, merged-window expansion, schema columns, and report path creation.

Q3 Threat Surface: Low. Outputs are local CSV reports; ensure directory creation is scoped to `backend/artifacts/event_device_control/reports/` and no arbitrary paths are needed in the notebook.
Q4 Requirement Impact: Advances the milestone schedule-output success criteria; no active requirement status change.
Q5 Failure Modes: No feasible candidate, identical-cost candidates, no events, invalid output path, and merged event IDs requiring per-event expansion.
Q6 Load Profile: Sorting candidate tables is small-data work; avoid O(unbounded) searches beyond configured offsets and device subsets.
Q7 Negative Tests: Empty candidate table, malformed candidate table, and missing required output columns before persistence.

Done when: A single utility call can return selected schedules and compact candidate diagnostics for a season, and tests prove both feasible and infeasible behavior.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`

## Verification

uv run --project backend pytest backend/tests/test_utils.py -k event_optimizer

## Observability Impact

Adds explicit schedule rationale fields and compact diagnostics for judge inspection in the notebook.
