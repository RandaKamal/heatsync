---
estimated_steps: 22
estimated_files: 1
skills_used: []
---

# T02: Create test_energy.py with scenario logic and notebook execution tests

## Why
The milestone requires automated verification. R006 validation needs proof that occupancy heat gains, setback scenarios, and savings calculations produce correct results. The test follows the pattern established by S04's test_physical.py.

## Do
1. Create `backend/tests/test_energy.py` with these tests:
   - **`test_occupancy_heat_gain_calculation`**: Verify that the occupancy heat-gain function produces expected kW values given known inputs (N_people=2, q_sensible=75W). Assert Q_occ = 0.15 kW for occupied periods and 0.0 for unoccupied.
   - **`test_setback_schedule_generation`**: Verify that setback schedule arrays correctly assign reduced setpoints during unoccupied hours and standard setpoints during occupied hours. Check that the schedule length matches the input data length.
   - **`test_savings_positive_for_setback`**: Load processed heating data, calibrate 2R2C (replicating test_physical.py pattern), run baseline and at least one setback simulation, verify that setback_kWh <= baseline_kWh (savings >= 0). Uses same `simulate_2r2c`, `objective`, bounded L-BFGS-B pattern from S04.
   - **`test_comfort_violation_detection`**: Construct a synthetic temperature trace that dips below comfort minimum during occupied hours, verify the violation detection logic correctly counts the number of comfort violations.
   - **`test_notebook_execution`**: Execute `06_energy_controls.ipynb` via nbconvert ExecutePreprocessor with timeout=300s, assert no CellExecutionError.

2. Follow the test_physical.py pattern:
   - Import `load_processed` from `notebooks.utils`.
   - Replicate `simulate_2r2c` locally in the test file (same pattern as test_physical.py — keep tests self-contained).
   - Use `np.random.seed(42)` for deterministic calibration.
   - Use `os.path.abspath` for path resolution.

3. Ensure all tests pass: `uv run --project backend pytest backend/tests/test_energy.py -v`
4. Ensure ruff check passes: `uv run --project backend ruff check backend/tests/test_energy.py`
5. Ensure ruff format passes: `uv run --project backend ruff format --check backend/tests/test_energy.py`

## Done-when
- `backend/tests/test_energy.py` exists with at least 5 tests.
- All tests pass: `uv run --project backend pytest backend/tests/test_energy.py -v` shows all green.
- `uv run --project backend ruff check backend/tests/test_energy.py` returns 0 errors.
- `uv run --project backend ruff format --check backend/tests/test_energy.py` returns 0 errors.

## Inputs

- `backend/notebooks/06_energy_controls.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/tests/test_physical.py`

## Expected Output

- `backend/tests/test_energy.py`

## Verification

uv run --project backend pytest backend/tests/test_energy.py -v && uv run --project backend ruff check backend/tests/test_energy.py && uv run --project backend ruff format --check backend/tests/test_energy.py
