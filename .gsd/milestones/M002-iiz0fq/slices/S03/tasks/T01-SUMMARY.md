---
id: T01
parent: S03
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/utils.py
  - backend/tests/test_event_control_reporting.py
key_decisions:
  - Smart-control report power is simulated exclusively from schedule device flags through the learned device power model; measured validation power is baseline-only.
  - Per-event report metrics aggregate from smart-control start through event end so preconditioning energy/cost/CO2 are included, while comfort metrics remain transparent in the same preserved row.
duration: 
verification_result: passed
completed_at: 2026-06-21T09:52:07.246Z
blocker_discovered: false
---

# T01: Added leakage-safe baseline-vs-smart-control comparison time-series and per-event report augmentation helpers with focused edge-case tests.

**Added leakage-safe baseline-vs-smart-control comparison time-series and per-event report augmentation helpers with focused edge-case tests.**

## What Happened

Added typed helper contracts in `backend/notebooks/utils.py` for S03 reporting:

- `COMPARISON_TIMESERIES_COLUMNS` defines the stable time-series output prefix for downstream notebook/report consumers.
- `EVENT_CONTROL_REPORT_METRIC_COLUMNS` defines the stable metric suffix appended to preserved S02 schedule rows.
- `build_event_control_comparison_timeseries(...)` expands selected S02 schedules onto a validation `DatetimeIndex`, keeps measured `room_power_kw`/`power_draw_kw` only in `baseline_*` columns, simulates `smart_power_kw` through `predict_device_power(...)` using schedule device flags, and computes interval plus cumulative kWh, EUR, CO2, comfort-band, and degree-minute columns.
- `augment_event_control_report(...)` preserves all schedule columns and appends event-level baseline/smart energy, cost, CO2, savings percentages, temperature MAE/RMSE, comfort-hit rate, degree-minutes, and transparent `report_status`/`report_reason` fields.
- `classify_event_control_status(...)` keeps infeasible, comfort-missed, negative-savings, and neutral-savings rows visible instead of filtering them out.

Added `backend/tests/test_event_control_reporting.py` with deterministic miniature frames that pin the leakage-safe smart-power contract, stable column contracts, edge-case row visibility, status classification, and malformed-input errors. During implementation, the first red check failed at import as expected because helpers did not exist yet; an intermediate test failure showed event report aggregation was only using the occupied event window, so `_event_window_mask(...)` was adjusted to aggregate from smart-control start through event end for energy/cost/CO2 comparisons.

## Failure Modes

- External APIs/network/subprocesses: none in the helper implementation; helpers are pure in-memory pandas/model transformations.
- Filesystem: none in these new helpers; CSV persistence remains owned by the pre-existing `save_event_control_schedule_report(...)` path.
- Malformed validation frame: `build_event_control_comparison_timeseries(...)` raises `ValueError` if `validation_df` is not indexed by `DatetimeIndex` or lacks a baseline measured-power column.
- Malformed schedule frame: `_require_schedule_columns(...)` raises `ValueError` when required schedule/device columns are absent.
- Malformed comparison frame: `augment_event_control_report(...)` bubbles validation errors if the comparison frame is not datetime-indexed.
- Malformed device power model: the helper intentionally delegates to `predict_device_power(...)`; missing model internals bubble from the learned-device-power surface instead of silently substituting measured future power.

## Load Profile

- Runtime load dimension is local pandas frame size: rows at 15-minute validation resolution multiplied by configured device count. At 10x the expected heating/cooling validation windows, CPU/memory for DataFrame allocation and per-event masks saturate before any I/O because there is no network or filesystem fan-out.
- Protection applied: smart-control power prediction and interval/cumulative metric computations are vectorized with pandas; output remains one row per validation timestamp plus per-device diagnostic columns, and no background workers, connection pools, or unbounded external calls are introduced.
- Remaining tradeoff: per-event report aggregation uses one boolean mask per schedule row, which is acceptable for judge validation windows and transparent reports but should be revisited if event counts grow orders of magnitude beyond notebook validation use.

## Negative Tests

- `backend/tests/test_event_control_reporting.py::test_comparison_timeseries_uses_measured_power_only_for_baseline` guards against leakage by making measured baseline power very different from learned smart power and asserting `smart_power_kw` comes from schedule flags plus `predict_device_power(...)`.
- `backend/tests/test_event_control_reporting.py::test_augmented_report_preserves_edge_case_rows_and_statuses` verifies infeasible, comfort-missed, negative-savings, and neutral-savings rows remain present and receive concise statuses.
- `backend/tests/test_event_control_reporting.py::test_reporting_helpers_reject_malformed_inputs` covers non-`DatetimeIndex` validation input, missing schedule columns, missing baseline power column, and the neutral-savings classifier boundary.

## Verification

Verified the task-specified pytest module passes, the touched Python files compile, and the existing S02 event-control optimizer/device-power regression subset still passes after extending the shared utility module.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py` | 0 | ✅ pass | 3520ms |
| 2 | `uv run --project backend python -m py_compile backend/notebooks/utils.py backend/tests/test_event_control_reporting.py` | 0 | ✅ pass | 125ms |
| 3 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_utils.py -k 'event_optimizer or device_power_model'` | 0 | ✅ pass | 2213ms |

## Deviations

Added a shared event-control regression subset from `backend/tests/test_utils.py` to protect existing S02 optimizer/device-power behavior beyond the task-specified test command. No implementation-scope deviations.

## Known Issues

No known issues for this task. The per-event aggregation remains intentionally notebook-scale and may need vectorized interval indexing if future validation workloads grow far beyond the planned judge windows.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/tests/test_event_control_reporting.py`
