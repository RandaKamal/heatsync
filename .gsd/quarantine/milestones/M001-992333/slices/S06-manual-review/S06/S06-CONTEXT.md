---
id: S06
milestone: M001-992333
status: ready
---

# S06: Energy Controls and Savings Optimization — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver a Jupyter notebook (`06_energy_controls.ipynb`) that estimates occupancy-based internal heat gains, simulates night-and-weekend setback control strategies using the calibrated 2R2C thermal model from S04, and presents HVAC energy savings in kWh via a summary table and bar chart for both the heating and cooling time windows.

## Why this Slice

S06 closes the loop from physical modelling (S04) to actionable energy savings — demonstrating that the calibrated 2R2C parameters have practical value beyond curve fitting. It depends on S01 (preprocessed data) and S04 (model parameters) and must complete before S07 (automated notebook suite integration) can run the full suite.

## Scope

### In Scope

- Night-and-weekend setback analysis using `space_events.csv` calendar to partition occupied vs unoccupied periods.
- Two scenarios compared: **baseline** (hold event temperature 21 °C 24/7) vs **calendar setback** (drop to minimum temperature 11 °C outside events).
- Calendar-event occupancy heat gain estimation: configurable constant for occupant count (default 5) × 75 W sensible heat per person during occupied intervals.
- 2R2C thermal model simulation of room temperature decay during unoccupied setback periods, using calibrated R and C parameters loaded from a JSON file produced by S04.
- Physics-based energy estimate for reheat demand when transitioning from setback to event temperature.
- Analysis run on **both** time windows: heating (`2026-03-30` to `2026-04-05`) and cooling (`2026-05-25` to `2026-05-31`).
- Summary table showing total kWh per scenario per time window with percentage savings.
- Grouped bar chart comparing baseline vs setback energy for each time window.
- Simple threshold comfort model: comfort = room temperature ≥ event temperature (21 °C) during occupied periods; discomfort = any timestep below target during an event.

### Out of Scope

- Parametric sweep of setback depths (varying setback temperature across a range).
- Occupancy-predictive preheating or optimal preheat start-time calculation.
- ASHRAE 55 PMV/PPD thermal comfort evaluation.
- Dynamic clothing-adjusted setpoints (seasonal clo lookup).
- WiFi-based occupancy estimation (no WiFi data in dataset).
- Deriving occupant count from event metadata/type (current data is all SINGLETON type).
- Daily or hourly breakdown tables; heatmap visualizations.
- Plug load savings estimation separate from HVAC.

## Constraints

- Must use Python ≥ 3.13 with PyTorch, SciPy, and matplotlib available in the backend `uv` environment.
- All notebook code must be importable/runnable headlessly by `nbconvert` for S07 integration.
- Occupant count and heat-gain-per-person must be defined as named constants at the top of the notebook so the user can adjust them without modifying logic.
- The 2R2C simulation function should live in `backend/notebooks/utils.py` (or be imported from it) so both S04 and S06 share the same physics code.

## Integration Points

### Consumes

- `backend/data/heating_2026-03-30_to_2026-04-05/power_draw.csv` — Device power draw (kW) at 5-minute intervals for energy calculations.
- `backend/data/heating_2026-03-30_to_2026-04-05/space_events.csv` — Calendar events defining occupied periods (heating window).
- `backend/data/cooling_2026-05-25_to_2026-05-31/power_draw.csv` — Power draw for cooling window.
- `backend/data/cooling_2026-05-25_to_2026-05-31/space_events.csv` — Calendar events for cooling window.
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv` — Room and outside temperature readings for 2R2C simulation.
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_snapshots.csv` — Temperature readings for cooling window.
- `backend/notebooks/utils.py` — Shared preprocessing utilities from S01 (CSV loading, 15-min alignment, feature engineering).
- `backend/notebooks/model_params.json` — Calibrated 2R2C parameters (R_wall, R_window, C_room, C_wall) written by S04's `04_physical_modeling.ipynb`.

### Produces

- `backend/notebooks/06_energy_controls.ipynb` — Complete energy controls and savings notebook.
- Inline outputs: summary table of kWh savings per scenario per time window; grouped bar chart; occupancy heat gain time series overlay.

## Open Questions

- **2R2C simulation function placement** — Should the `simulate_2r2c()` function be defined in `utils.py` during S04 and reused here, or defined fresh in S06? Current thinking: define in `utils.py` during S04, import in both notebooks.
- **Aggressive setback scenario** — The current scope compares baseline (21 °C) vs calendar setback (11 °C). If during implementation there's room, a third scenario with a more aggressive setback (e.g. 8 °C) could be added, but it is not required.
