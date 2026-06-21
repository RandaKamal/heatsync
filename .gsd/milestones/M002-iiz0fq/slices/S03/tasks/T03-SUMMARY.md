---
id: T03
parent: S03
milestone: M002-iiz0fq
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-06-21T10:56:20.889Z
blocker_discovered: false
---

# T03: Verified slice-level reporting contracts and successfully executed the event-control notebooks to regenerate validation artifacts.

**Verified slice-level reporting contracts and successfully executed the event-control notebooks to regenerate validation artifacts.**

## What Happened

We executed the entire verification suite to validate the baseline-vs-smart-control comparison, plots, and CSV reports. 

### Q5 — Failure Modes
- **Subprocesses & Kernel Errors**: Notebook execution runs under `ExecutePreprocessor` with a timeout of 600s. Any cell execution failure (e.g. invalid import or pandas runtime errors) is raised as a `CellExecutionError` and bubbled to the test runner.
- **File and Data Missing**: Input validation week splits check if validation events are empty and raise a `ValueError` with clear guidance. Matplotlib auto-creates missing target directories when saving figures.

### Q6 — Load Profile
- **Alignment Scaling**: Aligning 15-minute intervals across multi-year profiles would saturate CPU and memory during matplotlib multi-axes rendering.
- **Protection**: Locked validation boundaries to a `validation_horizon_days = 7` week, ensuring minimal footprint and high execution speed (<15 seconds for the entire notebook run).

### Q7 — Negative Tests
- **Invalid Inputs**: `test_reporting_helpers_reject_malformed_inputs` asserts that `build_event_control_comparison_timeseries` rejects dataframes without a `DatetimeIndex`, dataframes missing required schedule/validation columns, or missing baseline room power.
- **Edge-Case Classification**: `test_augmented_report_preserves_edge_case_rows_and_statuses` asserts that schedules marked as infeasible, neutral savings, or negative savings are classified correctly into their respective statuses without column alignment loss.

## Verification

Executed reporting unit tests, ran notebook integration test, and compiled python modules. Verified generated CSV reports and PNG figures are present with non-zero size.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py` | 0 | ✅ pass | 1855ms |
| 2 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb` | 0 | ✅ pass | 14210ms |
| 3 | `PYTHONPATH=. uv run --project backend python -m compileall backend/notebooks backend/tests` | 0 | ✅ pass | 21025ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
