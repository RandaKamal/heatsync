---
id: T01
parent: S06
milestone: M001
key_files:
  - backend/notebooks/06_energy_controls.ipynb
key_decisions:
  - Defined discrete simulation thermostat feedback loop logic to calculate dynamic HVAC power requirements for meeting setback setpoint targets.
  - Integrated sensible occupancy heat gain (0.15 kW) into the indoor thermal node heat balance equation.
duration: 
verification_result: passed
completed_at: 2026-06-20T15:49:51.527Z
blocker_discovered: false
---

# T01: Built 06_energy_controls.ipynb with 2R2C calibration, occupancy heat gains, setback scenarios, savings, and comfort compliance analysis.

**Built 06_energy_controls.ipynb with 2R2C calibration, occupancy heat gains, setback scenarios, savings, and comfort compliance analysis.**

## What Happened

Built and verified `backend/notebooks/06_energy_controls.ipynb` containing occupancy sensible heat gain calculations, comfort bounds definition, 2R2C building thermal calibration via bounded L-BFGS-B, and thermostat setback simulation scenarios. Evaluated Baseline (constant 21°C), Mild Night Setback (18°C/21°C), Deep Night Setback (16°C/21°C), and Weekend + Night Setback (16°C/17°C/21°C) scenarios. Calculated estimated HVAC energy savings and checked comfort compliance constraints during occupied schedules. All plots (setpoint overlays, temperature response vs comfort bounds, and savings bar charts) were successfully generated and the notebook executes without error.

## Verification

Verified execution of the notebook via nbconvert and verified physical model tests via pytest.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb` | 0 | ✅ pass | 5697ms |
| 2 | `uv run --project backend pytest backend/tests/test_physical.py` | 0 | ✅ pass | 19025ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/06_energy_controls.ipynb`
