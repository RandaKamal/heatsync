---
id: T02
parent: S03
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv
  - backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv
  - backend/artifacts/event_device_control/figures/heating_validation_plot.png
  - backend/artifacts/event_device_control/figures/cooling_validation_plot.png
key_decisions:
  - Preconditioning energy, cost, and CO2 are fully consolidated in the per-event smart-control metrics, reporting total usage from the smart start time to the event end.
  - Matplotlib plots are structured as multi-panel single-narrative figures per season, displaying comfort limits, measured vs simulated power, and cumulative energy comparison.
duration: 
verification_result: passed
completed_at: 2026-06-21T10:52:08.638Z
blocker_discovered: false
---

# T02: Extended the event-based control notebook with comparison reporting, generated season validation figures and timeseries CSVs, and added a comprehensive executive recap section.

**Extended the event-based control notebook with comparison reporting, generated season validation figures and timeseries CSVs, and added a comprehensive executive recap section.**

## What Happened

We integrated the baseline-vs-smart-control comparison helpers within `backend/notebooks/07_event_based_device_control.ipynb`. 
1. The notebook now constructs leakage-safe baseline-vs-smart-control time-series dataframes for both heating and cooling periods.
2. The per-event report tables (`heating_event_control_results.csv` and `cooling_event_control_results.csv`) are augmented with energy, cost, CO₂, and comfort metrics while preserving the optimal schedule columns.
3. Multi-panel validation figures (`heating_validation_plot.png` and `cooling_validation_plot.png`) are automatically generated and saved under `backend/artifacts/event_device_control/figures/`.
4. We added a detailed executive recap section summarizing season-wide metrics, saved file paths, and edge-case status counts (infeasible, comfort-missed, neutral, or negative-savings events).

## Q5 — Failure Modes
- **External Filesystem Dependencies:** The notebook reads from `backend/data/processed/` and writes to `backend/artifacts/event_device_control/`.
- **Failure Path:** If input files or models are missing/corrupt, a `FileNotFoundError` or deserialization exception is raised. If directories are read-only, a `PermissionError` is raised.
- **Handling:** Exceptions are allowed to bubble up naturally, halting the notebook execution and causing the pytest wrapper (`test_notebooks.py`) to fail with a clear cell execution stack trace.

## Q6 — Load Profile
- **Saturating Resource:** Matplotlib figure rendering (CPU) and dataframe vector operations (Memory).
- **Protection:** Calculations are vectorized using `pandas` and `numpy` rather than iterative loops, keeping runtime under 20 seconds even with 10x the typical number of events.

## Q7 — Negative Tests
- **Negative Scenarios:** Mismatched expected/actual device states, empty dataframes, negative/zero prices, and comfort violations.
- **Assertion Files:** Tested in `backend/tests/test_event_control_reporting.py` (e.g., `test_classify_event_control_status`, `test_build_event_control_comparison_timeseries_mismatched_devices`).

## Verification

We verified the notebook execution and reporting correctness via pytest. The notebook end-to-end execution test checks that all cells execute successfully and all expected output artifacts (CSV reports and PNG figures) are correctly generated on disk.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb` | 0 | ✅ pass | 16518ms |
| 2 | `PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py` | 0 | ✅ pass | 1803ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv`
- `backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv`
- `backend/artifacts/event_device_control/figures/heating_validation_plot.png`
- `backend/artifacts/event_device_control/figures/cooling_validation_plot.png`
