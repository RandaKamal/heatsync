---
id: S04
parent: M001
milestone: M001
provides:
  - Physical 2R2C calibration parameters and PINN convergence models for downstream HVAC controls optimization
requires:
  - slice: S01
    provides: Shared data loading and processed aligned dataframes
affects:
  - S06
  - S07
key_files:
  - backend/notebooks/04_physical_modeling.ipynb
  - backend/tests/test_physical.py
key_decisions:
  - Converted simulation dt (900s) to hours inside simulation loop for units parity with power draw (kW) and temperature rates, stabilizing multi-restart optimization
  - Constructed composite loss combining Data MSE and finite-difference heat equation physics residual with scaled parameters derived from 2R2C calibration
patterns_established:
  - Standardized PINN training loops with multi-objective physics-informed composite loss in Jupyter environments.
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M001/slices/S04/tasks/T01-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T02-SUMMARY.md
  - .gsd/milestones/M001/slices/S04/tasks/T03-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-06-20T15:03:45.469Z
blocker_discovered: false
---

# S04: Physical Grey-Box and PINN Models

**Calibrated positive physical 2R2C parameters and trained PyTorch PINN thermal models on aligned Heat Pump data, verified by automated unit tests.**

## What Happened

Successfully implemented Slice S04. Created `04_physical_modeling.ipynb` which parses 15-minute processed heat pump datasets, implements discrete-time 2R2C circuit models, and executes multi-restart bounded L-BFGS-B calibration ensuring physical parameters (R, C) converge to positive constraints. Added a physics-informed neural network (PINN) architecture in PyTorch using a composite loss term that combines empirical data MSE and finite-difference heat equation residuals, demonstrating loss convergence. Finally, developed `backend/tests/test_physical.py` containing programmatic checks for the grey-box calibration bounds, PINN convergence, and notebook execute preprocessors. All unit tests, Ruff style checks, and execution runs pass cleanly.

## Verification

Verified by running pytest suite `uv run --project backend pytest backend/tests/test_physical.py -v` which completed with 3 passed tests, and ruff check `uv run --project backend ruff check` which found zero style or lint errors.

## Requirements Advanced

- R004 — Created the notebook implementing bounded positive parameter 2R2C calibration and PINN convergence loops, and implemented automated pytest tests for verification.

## Requirements Validated

- R004 — Execution of test_physical.py confirms positive R/C parameter convergence, decreasing PINN training loss, and end-to-end programmatic notebook execution.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

2R2C fit accuracy is sensitive to heat input proxy limitations and simplified envelope assumptions.

## Follow-ups

None.

## Files Created/Modified

- `backend/notebooks/04_physical_modeling.ipynb` — Create notebook implementing 2R2C calibration and PINN thermal modeling
- `backend/tests/test_physical.py` — Create unit tests validating 2R2C calibration, PINN convergence, and programmatic notebook execution
