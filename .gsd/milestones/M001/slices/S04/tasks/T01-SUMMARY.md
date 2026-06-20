---
id: T01
parent: S04
milestone: M001
key_files:
  - backend/notebooks/04_physical_modeling.ipynb
key_decisions:
  - Converted simulation dt (900s) to hours inside simulation loop for units parity with power draw (kW) and temperature rates, stabilizing multi-restart optimization
duration: 
verification_result: passed
completed_at: 2026-06-20T14:35:26.294Z
blocker_discovered: false
---

# T01: Created 04_physical_modeling.ipynb with discrete 2R2C thermal circuit calibration using bounded L-BFGS-B

**Created 04_physical_modeling.ipynb with discrete 2R2C thermal circuit calibration using bounded L-BFGS-B**

## What Happened

Created `backend/notebooks/04_physical_modeling.ipynb` containing a discrete 2R2C thermal circuit simulation model and a bounded L-BFGS-B calibration routine with deterministic multi-start restarts (8 iterations). The simulator uses hour-scaled dt steps for physical units consistency against power draw (kW) input and indoor/outdoor temperature values. It calibrates effectively on the first device's heating window data, yielding positive values for R_in, C_in, R_out, and C_wall with an RMSE of 1.0171 °C.

### Failure Modes (Q5)
- Invalid or unstable simulation parameters: Handled by returning a large objective function penalty value (1e12) and breaking simulation early if temperature diverges (above 1000°C).
- Insufficient or empty dataset: Guarded by a minimum calibration row count check (MIN_CALIBRATION_ROWS = 10) raising ValueError.

### Load Profile (Q6)
- The optimization scales with iteration count and time series length. It is protected by limiting the calibration window to the first 300 data points (O(1) run time of ~8 seconds total) and limiting random restarts to 8 iterations.

### Negative Tests (Q7)
- Guards against negative candidate parameter updates by setting L-BFGS-B bounds to `(0.001, 50.0)` for all 4 parameters, and raising ValueError if any simulated parameter is non-positive.

## Verification

Executed the notebook programmatically with nbconvert and verified that it completed without error, resulting in finite positive physical parameters (R_in, C_in, R_out, C_wall) and a finite RMSE of 1.0171 °C, followed by a clean Ruff lint check pass.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300` | 0 | ✅ pass | 8000ms |
| 2 | `uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb` | 0 | ✅ pass | 100ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/04_physical_modeling.ipynb`
