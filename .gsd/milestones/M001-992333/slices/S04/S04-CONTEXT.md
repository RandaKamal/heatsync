---
id: S04
milestone: M001-992333
status: ready
---

# S04: Physical Grey Box and PINN Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver `backend/notebooks/04_physical_modeling.ipynb` with a 2R2C grey-box thermal model calibrated via SciPy and a Physics-Informed Neural Network (PINN) enforcing the same 2R2C ODE, on both heating and cooling windows.

## Why this Slice

S04 is the physics-informed core of the milestone. It produces calibrated thermal parameters (R1, R2, C1, C2) that S06 (Energy Controls) hardcodes for setback simulation. It also demonstrates that neural networks can be constrained by known physics — a key thesis of the HeatSync research. S04 depends only on S01's preprocessed data and must land before S06 can begin.

## Scope

### In Scope

- `backend/notebooks/04_physical_modeling.ipynb` in two distinct parts:

**Part 1: 2R2C Grey-Box Calibration**
- Standard building 2R2C thermal network topology:
  - R1 = wall-to-room thermal resistance (K/W)
  - R2 = wall-to-outside thermal resistance (K/W)
  - C1 = room air thermal capacitance (J/K)
  - C2 = wall thermal capacitance (J/K)
  - Heat input Q = `power_draw_kw` from the dataset
  - Boundary condition: `temperature_outside` from the dataset
  - Target: `temperature_in` from the dataset
- ODE system:
  - `C1 * dT_room/dt = (T_wall - T_room)/R1 + Q_hp`
  - `C2 * dT_wall/dt = (T_outside - T_wall)/R2 - (T_wall - T_room)/R1`
- Calibration via `scipy.optimize.minimize` (L-BFGS-B) with bounds `(1e-6, None)` for all 4 parameters.
- 5 random restarts per window, pick the result with lowest residual.
- Both heating and cooling windows calibrated independently — two sets of parameters.
- Calibrated parameters printed as named constants in notebook output for S06 to hardcode.
- Simulated-vs-measured temperature plot per window.
- Convergence status and residual norm printed.

**Part 2: Physics-Informed Neural Network (PINN)**
- Small feedforward neural net predicting T_room(t) from time input.
- Custom loss = `data_loss` (MSE vs measured temperature) + `lambda * physics_loss` (2R2C ODE residual via `torch.autograd.grad`).
- Uses calibrated R1, R2, C1, C2 from Part 1 as **fixed constants** in the physics loss — PINN does not re-learn the parameters.
- Hardcoded `LAMBDA_PHYSICS = 0.1` with an explanatory markdown cell describing the tradeoff.
- 200 training epochs, `torch.manual_seed(42)`, NaN/Inf guard with early break.
- Training loss curve showing total, data, and physics loss components.
- PINN-predicted vs measured temperature plot.

**Notebook feel:**
- Structured two-part layout with educational markdown cells explaining the physics throughout.
- Inline matplotlib plots only — no saved image files.
- Part 1 outputs a calibrated parameters table (both windows side-by-side).
- Part 2 outputs a decomposed loss curve and prediction plot.

### Out of Scope

- PINN learning R,C parameters as trainable torch parameters — R,C come from the grey-box calibration.
- Lambda sweep or adaptive lambda scheduling — hardcoded `0.1` is sufficient for the demo.
- 3R3C or higher-order thermal networks.
- Ventilation or infiltration resistance paths.
- Saving parameters to JSON or disk — S06 hardcodes the printed constants.
- Sensitivity analysis or parameter uncertainty quantification.
- GPU/CUDA-specific code — CPU-only sufficient for dataset size.
- Comparison table of grey-box RMSE vs PINN RMSE (the visual overlay is sufficient).

## Constraints

- Must import data via `utils.py` (`load_and_preprocess('heating')` / `load_and_preprocess('cooling')`) — no direct CSV loading.
- S01 data contract columns: `timestamp` (index), `temperature_in`, `temperature_outside`, `target_temperature`, `humidity`, `co2_ppm`, `operation_mode`, `power_draw_kw`, `has_alarm`, `hour`, `day_of_week`, `is_weekend`.
- SciPy and PyTorch already in `backend/pyproject.toml` from S01/T01. No new dependencies required.
- Python ≥ 3.13.
- Milestone acceptance criteria requires: all calibrated R > 0 and C > 0. The 5-restart strategy with positive bounds must achieve this.
- PINN convergence is a milestone acceptance criterion — the loss must decrease during training (need not reach a specific value).
- Must pass `ruff check` and `mypy` linting.
- `np.random.seed(42)` for SciPy restart reproducibility and `torch.manual_seed(42)` for PINN.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — `load_and_preprocess(window)` returning a 15-min aligned DataFrame with the curated column set. Key columns used: `temperature_in`, `temperature_outside`, `power_draw_kw`.

### Produces

- `backend/notebooks/04_physical_modeling.ipynb` — self-contained notebook that, when executed:
  1. Prints calibrated 2R2C parameters (R1, R2, C1, C2) for both heating and cooling windows as named constants.
  2. Shows simulated-vs-measured temperature plots.
  3. Shows PINN training loss curves and prediction plots.
- **S06 dependency:** S06 hardcodes the printed R1, R2, C1, C2 values from this notebook's heating-window output (same pattern as S03 hardcoding S02's SARIMAX metrics).

## Open Questions

- **ODE integration method for forward simulation** — The 2R2C ODE needs numerical integration to simulate T_room(t) given calibrated parameters. Current thinking: use `scipy.integrate.solve_ivp` with RK45 on the 15-min timesteps; the SciPy minimize objective calls `solve_ivp` internally and compares the simulated trajectory to measured temperatures.
- **PINN architecture size** — A small feedforward net (e.g. 2 hidden layers × 32 units, Tanh activation) should suffice for learning a smooth temperature field. Current thinking: start small; the physics loss guides the shape, so the net doesn't need to be large.
- **Power draw units for Q_hp** — `power_draw_kw` is in kilowatts. The 2R2C ODE uses watts (or needs consistent units with R in K/W and C in J/K). Current thinking: convert kW → W in the notebook before calibration, or adjust parameter interpretation. Decide during implementation.

## Key Behavioural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| 2R2C topology | Standard building: R1 (wall-room), R2 (wall-outside), C1 (room air), C2 (wall mass) | Well-understood thermal network; 4 parameters sufficient for the dataset |
| Calibration windows | Both heating and cooling independently | Physics may differ between modes; separate params show this |
| Convergence strategy | 5 random restarts, bounds (R,C > 0), pick best residual | Mitigates local minima risk — the milestone's highest-risk pitfall |
| PINN scope | Enforces 2R2C ODE with fixed R,C from grey-box calibration | Shows physics-informed ML without re-discovering parameters |
| PINN lambda | Hardcoded 0.1 with explanatory markdown | Simple, reproducible; reader can experiment |
| PINN training | 200 epochs, manual_seed(42), NaN guard + early break | Deterministic, safe for S07 integration test |
| S06 interface | Printed constants, S06 hardcodes | Same cross-notebook pattern as S03→S02; no file dependencies |
| Notebook layout | Structured two-part (grey-box then PINN) with educational markdown | Clear separation; reader follows the physics progression |
