---
estimated_steps: 37
estimated_files: 1
skills_used: []
---

# T01: Created 04_physical_modeling.ipynb with discrete 2R2C thermal circuit calibration using bounded L-BFGS-B

## Why
R004 requires calibrating a 2R2C grey-box model with positive R and C values. The 2R2C model is the primary physical-model proof for this slice and the milestone success criterion. This task builds the notebook foundation (imports, data loading, physical input selection) and the complete 2R2C calibration section.

## Do
1. Create `backend/notebooks/04_physical_modeling.ipynb` as a Jupyter notebook.
2. **Section 1 (Introduction):** Markdown cell explaining physical grey-box modeling, the 2R2C thermal circuit analogy (two resistances, two capacitances), and how it differs from data-driven approaches in S02/S03. Reference R004.
3. **Section 2 (Data Loading & Physical Input Selection):** Code cell importing dependencies (`os`, `sys`, `warnings`, `numpy`, `pandas`, `matplotlib`, `scipy.optimize`, `torch`). Add `sys.path.append(os.path.abspath(os.path.join(os.getcwd(), '..')))` then `from notebooks.utils import load_processed`. Load heating data via `load_processed('heating')`. Select first device. Extract columns:
   - `T_in` = `status_temperature_in_celsius` (indoor temperature)
   - `T_out` = `outside_temperature` (ambient/outdoor temperature)
   - `Q` = `power_draw_kw` (heat input proxy)
   - Drop NaN rows. Document proxy limitations in a markdown cell.
   - Set `dt = 900.0` (15-minute sampling in seconds).
4. **Section 3 (2R2C Model Equations):** Markdown cell with discrete-time 2R2C equations. The 2R2C model has states [T_indoor, T_wall]:
   - `T_indoor[k+1] = T_indoor[k] + dt/C_in * ((T_wall[k] - T_indoor[k])/R_in + Q[k])`
   - `T_wall[k+1] = T_wall[k] + dt/C_wall * ((T_out[k] - T_wall[k])/R_out - (T_wall[k] - T_indoor[k])/R_in)`
   - Parameters: R_in, C_in, R_out, C_wall (all must be positive).
   - Code cell implementing `simulate_2r2c(params, T_in_init, T_wall_init, T_out, Q, dt)` that returns predicted T_indoor array.
5. **Section 4 (Bounded L-BFGS-B Calibration):** Code cell implementing:
   - Objective function computing MSE between simulated and observed `T_in`.
   - Initial wall temperature `T_wall_init = (T_in[0] + T_out[0]) / 2`.
   - Parameter bounds: `[(0.001, 50.0)] * 4` (all positive).
   - Multiple random restarts (5-10) with `np.random.seed(42)` for reproducibility.
   - Use `scipy.optimize.minimize(method='L-BFGS-B', bounds=bounds)`.
   - Collect results from all restarts, pick best by objective value.
   - Print convergence diagnostics: optimizer status, fun value, which restarts converged.
6. **Section 5 (2R2C Results):** Code cells showing:
   - Parameter table with R_in, C_in, R_out, C_wall values (assert all > 0).
   - Fitted-vs-observed temperature plot with matplotlib.
   - RMSE of the calibrated fit.
   - Markdown interpretation of physical meaning and limitations.
7. Set reproducibility seeds: `np.random.seed(42)` before optimization. Use `warnings.filterwarnings('ignore')` at top.
8. Ensure the notebook follows the same structural conventions as `03_forecasting_lstm.ipynb`: numbered sections, markdown explanations between code cells, clean output.

## Done-when
- `backend/notebooks/04_physical_modeling.ipynb` exists with Sections 1-5 complete.
- Running the notebook programmatically (`uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --output 04_physical_modeling.nbconvert.ipynb`) completes without error.
- The output contains a parameter table with 4 positive values for R_in, C_in, R_out, C_wall.
- A fitted-vs-observed plot is generated.
- `uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb` passes with zero errors.

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/notebooks/03_forecasting_lstm.ipynb`

## Expected Output

- `backend/notebooks/04_physical_modeling.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb
