---
id: T03
parent: S02
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/utils.py
  - backend/tests/test_utils.py
key_decisions:
  - Selected schedules are persisted only through a fixed owned report directory with filename-only report names to keep local CSV output scoped.
  - Diagnostics retain only compact top-candidate views per window rather than requiring full candidate CSV persistence.
duration: 
verification_result: passed
completed_at: 2026-06-21T07:17:01.009Z
blocker_discovered: false
---

# T03: Added event-control schedule selection, per-event schedule formatting, compact diagnostics, and scoped CSV report persistence for optimizer outputs.

**Added event-control schedule selection, per-event schedule formatting, compact diagnostics, and scoped CSV report persistence for optimizer outputs.**

## What Happened

Implemented T03 in `backend/notebooks/utils.py` by adding canonical schedule and diagnostics column contracts, deterministic candidate selection, per-window optimizer orchestration, merged-window expansion back to original event IDs, and a scoped report writer for selected schedules under `backend/artifacts/event_device_control/reports/`. Candidate selection now normalizes T02 candidate outputs, prefers feasible candidates, falls back to the smallest comfort violation when no feasible candidate exists, and breaks ties by expected cost, kWh, CO2, latest start offset, active-device count, and deterministic device signature. Schedule rows include the required downstream columns plus explicit rationale/status fields: feasibility, selection reason, comfort violation, candidate start offset, active device count, window ID, window timestamps, and merge rationale.

Extended `backend/tests/test_utils.py` with event optimizer tests covering feasible selection, infeasible fallback, tie-break ordering, merged-window expansion, output schema, empty-event behavior, malformed candidate inputs, and scoped report path creation/schema validation.

## Failure Modes

- Filesystem dependency: `save_event_control_schedule_report` creates only `backend/artifacts/event_device_control/reports/` by default and rejects `report_name` values containing path components, so arbitrary output paths are not accepted. Test coverage: `test_event_optimizer_report_path_creation_and_schema_validation` verifies directory creation and rejects `nested/report.csv`.
- Candidate-table dependency: schedule selection depends on T02 candidate rows containing required numeric, feasibility, offset, and active-device fields. `_normalise_candidate_table` validates required columns and raises a clear `ValueError` for empty or malformed candidate tables. Test coverage: `test_event_optimizer_rejects_empty_and_malformed_candidates`.
- Event dependency: orchestration depends on event rows with valid `starts_at` and `ends_at`, delegated to existing `consolidate_event_windows` validation. Empty event sets return empty schedule and diagnostics DataFrames with canonical columns instead of failing. Test coverage: `test_event_optimizer_returns_empty_outputs_for_no_events`.
- Configuration dependency: orchestration validates `EventControlConfig`, candidate offsets, device counts, and fixed four-device output formatting before simulation, so invalid optimizer settings fail before producing partial schedules.

## Load Profile

- The first saturating resource at 10x expected validation load is candidate table size: number of consolidated windows × configured offsets × generated device subsets. The implementation remains bounded by caller-provided `candidate_offsets` and `max_simultaneous_devices`, uses existing `simulate_all_candidates`, and only retains compact top-candidate diagnostics per window via `top_candidate_count` instead of requiring full candidate CSV persistence.
- Sorting is per consolidated window and uses pandas stable sort over the bounded candidate table; there is no unbounded search beyond configured offsets and device subsets.

## Negative Tests

- Empty candidate table: `test_event_optimizer_rejects_empty_and_malformed_candidates` asserts `ValueError`.
- Malformed candidate table: `test_event_optimizer_rejects_empty_and_malformed_candidates` asserts required-column validation.
- No events: `test_event_optimizer_returns_empty_outputs_for_no_events` asserts empty canonical outputs.
- Infeasible optimization: `test_event_optimizer_infeasible_fallback_uses_smallest_violation` asserts smallest-violation fallback and rationale.
- Identical-cost/tie cases: `test_event_optimizer_tie_breaks_by_latest_start_then_simpler_devices` asserts latest-start and simpler-device ordering.
- Merged event IDs: `test_event_optimizer_expands_merged_windows_and_formats_schema` asserts merged windows expand back to per-event rows.
- Persistence schema/path failures: `test_event_optimizer_report_path_creation_and_schema_validation` asserts required output columns and rejects nested report paths.

## Verification

Fresh verification passed for the task-required event optimizer tests and touched-file Python compilation. Required command `uv run --project backend pytest backend/tests/test_utils.py -k event_optimizer` passed with 7 tests selected and 37 deselected. Compile validation for `backend/notebooks/utils.py` and `backend/tests/test_utils.py` also passed.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_utils.py -k event_optimizer` | 0 | ✅ pass — 7 passed, 37 deselected | 1845ms |
| 2 | `uv run --project backend python -m py_compile backend/notebooks/utils.py backend/tests/test_utils.py` | 0 | ✅ pass — touched files compile | 135ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
