---
estimated_steps: 30
estimated_files: 1
skills_used: []
---

# T01: Build 06_energy_controls.ipynb with occupancy, comfort, setback, and savings logic

## Why
R006 requires estimating heating/cooling power draw, calculating occupancy sensible/latent heat gains, and evaluating setpoint setbacks. This task creates the complete energy controls notebook.

## Do
1. Create `backend/notebooks/06_energy_controls.ipynb` with these sections:
   - **Data Loading**: Import from `utils.load_processed('heating')`, select a single device, extract `T_in` (status_temperature_in_celsius), `T_out` (outside_temperature), `Q` (power_draw_kw), `occupancy_flag`, `hour_of_day`, `is_weekend`, `target_temp`.
   - **2R2C Calibration**: Replicate S04 pattern — define `simulate_2r2c(params, T_in_init, T_wall_init, T_out, Q, dt)` with dt=900s, run bounded L-BFGS-B calibration with 3 random restarts, bounds `[(0.001, 50.0)] * 4`. Print best-fit params table.
   - **Occupancy Heat Gains**: Define a simple schedule (occupied=07:00–22:00 weekdays, 09:00–22:00 weekends). Calculate sensible heat gain Q_occ = N_people × q_sensible (e.g., 2 occupants × 75W sensible = 150W = 0.15 kW). Calculate latent heat gain similarly (e.g., 2 × 55W = 0.11 kW). Show assumptions in a markdown cell. Create an occupancy heat-gain time series.
   - **Comfort Setpoints**: Define occupied comfort bounds (e.g., T_min_occ=20°C, T_max_occ=24°C). Define unoccupied setback temperature (e.g., T_setback=16°C). State these as explicit assumptions.
   - **Baseline Scenario**: Run `simulate_2r2c` with constant setpoint at T_target=21°C for the full period. Calculate baseline kWh = sum(power_draw_kw) × 0.25 (15-min intervals).
   - **Setback Scenarios**: Define and simulate at least 3 named scenarios:
     - *Mild Night Setback*: Reduce setpoint to 18°C during unoccupied hours (22:00–07:00).
     - *Deep Night Setback*: Reduce to 16°C during unoccupied hours.
     - *Weekend + Night Setback*: 16°C unoccupied + 17°C full weekend days.
   For each scenario, construct a setpoint schedule array, simulate 2R2C thermal response, estimate HVAC power required (based on how much heat must be supplied to maintain setpoint vs. natural drift), and sum kWh.
   - **Savings Estimation**: For each scenario, calculate: estimated_kWh, savings_kWh = baseline_kWh − scenario_kWh, savings_pct. Present as a pandas DataFrame table.
   - **Comfort Compliance**: Check each scenario for comfort violations — timestamps where simulated T_in < T_min_occ during occupied hours. Count violations per scenario. Add a comfort_status column to the scenario table.
   - **Plots**: Create at minimum:
     - Setpoint schedule overlay plot (baseline vs setback scenarios over 2 example days).
     - Simulated temperature response with comfort bounds shaded.
     - Bar chart of kWh by scenario with savings annotated.
   - **Caveats & Summary**: Markdown cell explaining that savings are approximate estimates based on simplified 2R2C model, transparent occupancy assumptions, and do not account for dynamic thermal mass effects, weather variability, or real actuator behavior.

2. Ensure notebook uses `%matplotlib inline`, proper imports (numpy, pandas, matplotlib, scipy.optimize), and `warnings.filterwarnings('ignore')` for clean output.

3. Add occupancy heat gain to Q input where appropriate — during occupied periods, add Q_occ to Q_heat to reflect internal gains.

4. All savings calculations must be deterministic given the same input data and random seed (use `np.random.seed(42)` for calibration restarts).

## Done-when
- `backend/notebooks/06_energy_controls.ipynb` exists and runs end-to-end via `jupyter nbconvert --to notebook --execute` with zero exceptions.
- Notebook output contains a scenario comparison table with at least 3 setback scenarios showing kWh, savings, and comfort status.
- Comfort bounds are explicitly stated and violations counted.
- Occupancy heat-gain assumptions are documented in markdown cells.
- At least 3 plots are generated (setpoint schedule, temperature response, savings bar chart).

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/notebooks/04_physical_modeling.ipynb`

## Expected Output

- `backend/notebooks/06_energy_controls.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb && echo 'Notebook executed successfully'
