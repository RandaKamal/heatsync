# S06: Energy Controls and Savings Optimization

**Goal:** Create 06_energy_controls.ipynb that calculates occupancy heat gains, defines comfort setpoints, evaluates setback strategies via 2R2C simulation, and reports estimated HVAC kWh energy savings with transparent assumptions and caveats.
**Demo:** Runs 06_energy_controls.ipynb showing occupancy heat gains, comfort setpoints, and estimated HVAC kWh savings from setback strategies.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Built 06_energy_controls.ipynb with 2R2C calibration, occupancy heat gains, setback scenarios, savings, and comfort compliance analysis.**
  - Files: `backend/notebooks/06_energy_controls.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb && echo 'Notebook executed successfully'

- [x] **T02: Created test_energy.py with scenario logic and notebook execution tests**
  - Files: `backend/tests/test_energy.py`
  - Verify: uv run --project backend pytest backend/tests/test_energy.py -v && uv run --project backend ruff check backend/tests/test_energy.py && uv run --project backend ruff format --check backend/tests/test_energy.py

## Files Likely Touched

- backend/notebooks/06_energy_controls.ipynb
- backend/tests/test_energy.py
