# S06: Energy Controls and Savings Optimization

**Goal:** Create 06_energy_controls.ipynb that calculates occupancy heat gains, defines comfort setpoints, evaluates setback strategies via 2R2C simulation, and reports estimated HVAC kWh energy savings with transparent assumptions and caveats.
**Demo:** Runs 06_energy_controls.ipynb showing occupancy heat gains, comfort setpoints, and estimated HVAC kWh savings from setback strategies.

## Must-Haves

- 06_energy_controls.ipynb runs end-to-end programmatically via nbconvert with zero exceptions.
- Notebook produces a scenario comparison table showing baseline kWh, setback kWh, estimated savings, and comfort status for at least 3 scenarios.
- Comfort guardrails (occupied temperature bounds) are explicitly defined and violations flagged per scenario.
- Occupancy heat-gain calculations use transparent schedule and magnitude assumptions stated in the notebook.
- 2R2C simulation is used to model thermal response under setback schedules using S04 calibration patterns.
- backend/tests/test_energy.py passes with all tests green covering scenario logic, savings calculations, and notebook execution.
- ruff check and ruff format pass on all new files.

## Proof Level

- This slice proves: automated — pytest test_energy.py (scenario logic + notebook execution) plus ruff lint

## Integration Closure

Consumes backend/notebooks/utils.py (load_processed) from S01 and replicates S04's simulate_2r2c calibration pattern for scenario simulation. Produces 06_energy_controls.ipynb as a standalone notebook. No downstream slices consume S06 outputs except S07 which runs it as part of the full notebook suite.

## Verification

- None — notebook-only slice with no runtime services.

## Tasks

- [x] **T01: Built 06_energy_controls.ipynb with 2R2C calibration, occupancy heat gains, setback scenarios, savings, and comfort compliance analysis.** `est:2-3 hours`
  ## Why
  R006 requires estimating heating/cooling power draw, calculating occupancy sensible/latent heat gains, and evaluating setpoint setbacks. This task creates the complete energy controls notebook.
  - Files: `backend/notebooks/06_energy_controls.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb && echo 'Notebook executed successfully'

- [x] **T02: Created test_energy.py with scenario logic and notebook execution tests** `est:1-2 hours`
  ## Why
  The milestone requires automated verification. R006 validation needs proof that occupancy heat gains, setback scenarios, and savings calculations produce correct results. The test follows the pattern established by S04's test_physical.py.
  - Files: `backend/tests/test_energy.py`
  - Verify: uv run --project backend pytest backend/tests/test_energy.py -v && uv run --project backend ruff check backend/tests/test_energy.py && uv run --project backend ruff format --check backend/tests/test_energy.py

## Files Likely Touched

- backend/notebooks/06_energy_controls.ipynb
- backend/tests/test_energy.py
