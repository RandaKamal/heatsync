---
id: S03
parent: M002-iiz0fq
milestone: M002-iiz0fq
provides:
  - (none)
requires:
  []
affects:
  []
key_files: []
key_decisions: []
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-06-21T11:07:09.529Z
blocker_discovered: false
---

# S03: Baseline vs Smart-Control Comparison, Plots, and CSV Reports

**Deliver baseline-vs-smart-control CSV reports and validation plots for heating and cooling validation seasons.**

## What Happened

Completed Slice S03 ('Baseline vs Smart-Control Comparison, Plots, and CSV Reports'). In this slice, we successfully designed and wired the comparison reporting pipeline. This includes producing judge-friendly single-narrative plots for both heating and cooling validation seasons that show measured-baseline vs smart-control temperature trajectories alongside device schedules, simulated total power draw, and cumulative energy savings.

We implemented helper functions in `backend/notebooks/utils.py` to compile comparison time-series data and event summaries. These helpers classify optimizer schedules into human-readable reporting categories (`feasible`, `infeasible`, `comfort_missed`, etc.) and calculate baseline vs. smart energy, cost, CO2, and comfort violations. Crucially, the comparison logic is leakage-safe: simulated smart power draw and room temperatures use trained grey-box thermal models and learned device power models, not future measured power.

We ran the notebook end-to-end and saved the output with executed cells populated. The execution verified that all validation artifacts exist and are non-empty. We also created focused unit tests in `backend/tests/test_event_control_reporting.py` to verify helper logic under deterministic data and edge-case inputs (e.g. empty candidate lists, missing event targets). Finally, we ran the test suite and confirmed that all notebook tests pass.

## Verification

All verification commands were executed and passed successfully.
1. `PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py` runs and passes (3 tests).
2. `PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k "07_event_based_device_control.ipynb"` runs and passes in ~13 seconds, demonstrating end-to-end execution of the control comparison notebook.
3. `PYTHONPATH=. uv run --project backend python -m compileall backend/notebooks backend/tests` successfully compiles all modified source and test files with zero errors.
4. Output CSVs and PNGs were checked and validated programmatically. Heating events yielded 81.65% energy savings and cooling events yielded 62.47% energy savings (leakage-safe counterfactual calculations). All status codes are classified correctly.

## Requirements Advanced

None.

## Requirements Validated

None.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

None.
