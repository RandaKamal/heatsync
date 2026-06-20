# S06: Energy Controls and Savings Optimization — UAT

**Milestone:** M001
**Written:** 2026-06-20T16:03:16.426Z

# UAT-S06: Energy Controls and Savings Optimization

## Preconditions
- The virtual environment is correctly synchronized and active with all development dependencies.
- Processed 15-minute aligned data is available under `backend/data/processed/`.
- Predecessor physical model parameters from S04 are available/calibrated.

## Test Cases

### UAT-06-01: Programmatic Notebook Execution
- **Command:** `uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb --stdout > /dev/null`
- **Expected Outcome:** The notebook executes end-to-end programmatically with zero exceptions.

### UAT-06-02: Scenario Table Output Verification
- **Command:** Inspecting programmatic notebook cells or executing tests in `backend/tests/test_energy.py` covering scenario output matching.
- **Expected Outcome:** A table comparing at least 3 scenarios (e.g., Baseline, Mild Setback, Deep Setback) is rendered with baseline kWh, setback kWh, estimated savings, and comfort status.

### UAT-06-03: Comfort Guardrail Check
- **Command:** `uv run --project backend pytest backend/tests/test_energy.py -k test_comfort_violations_detector`
- **Expected Outcome:** Comfort violations are correctly detected and flagged when indoor temperature falls below 20°C or rises above 24°C during occupied hours.

### UAT-06-04: Occupancy and Heat Gain Computation
- **Command:** `uv run --project backend pytest backend/tests/test_energy.py -k test_occupancy_heat_gain`
- **Expected Outcome:** Sensible (0.15 kW) and latent (0.05 kW) heat gains are calculated correctly based on the occupied/unoccupied schedules.

### UAT-06-05: 2R2C Feedback Simulation Logic
- **Command:** `uv run --project backend pytest backend/tests/test_energy.py -k test_simulate_setback_scenarios`
- **Expected Outcome:** 2R2C forward simulation models thermal response correctly under setbacks, and HVAC power responds dynamically to meet scheduled setpoints.

