---
estimated_steps: 7
estimated_files: 2
skills_used: []
---

# T01: Notebook scaffold and device-level data pipeline

1. Create `backend/notebooks/07_event_based_device_control.ipynb` with markdown header cells and config dicts at the top (`comfort_config`, `control_config`, `energy_config` with `electricity_price_eur_per_kWh: 0.35`, `co2_kg_per_kWh: 0.40`).
2. Load both seasonal datasets using existing `utils.py` loaders (`load_processed` or `build_aligned_dataset`). Verify the data shape: 15-minute grid, per-device columns present.
3. Build device-level features: aggregate 5-min `power_draw.csv` to 15-min mean power per device; create wide columns `device_i_active` and `device_i_power_kw` for i=1..4 with configurable activity threshold (`was_adjusting_temperature == 1` OR power > standby baseline).
4. Build room-level features: median for temperature/return-temp/humidity/CO2 across 4 devices, sum for power/energy.
5. Build event features from `space_events.csv`: `event_active`, `minutes_to_next_event`, `minutes_since_previous_event`, `next_event_start/end`, `inside_preconditioning_window`.
6. Add helper functions to `utils.py` as needed (e.g., `build_device_level_features`, `build_event_features`).
7. Print data quality summary: row counts per season, device counts, event counts, missing value stats.

## Inputs

- `backend/data/heating_2026-03-30_to_2026-04-05/`
- `backend/data/cooling_2026-05-25_to_2026-05-31/`
- `backend/data/devices.csv`
- `backend/notebooks/utils.py`

## Expected Output

- `backend/notebooks/07_event_based_device_control.ipynb`

## Verification

Run notebook cells through data pipeline section on both seasons; verify device-level and room-level DataFrames have expected columns and no NaN in critical fields. `uv run --project backend python -c "from backend.notebooks.utils import *; print('import ok')"` succeeds.
