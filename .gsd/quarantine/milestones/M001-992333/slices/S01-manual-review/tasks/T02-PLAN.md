---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Implement shared preprocessing utilities

Create backend/notebooks/utils.py with functions for loading CSVs, aligning to 15-minute clock, linearly interpolating missing values, engineering features, and estimating occupancy heat gains.

## Inputs

- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/power_draw.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/space_events.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_intervals.csv`

## Expected Output

- `backend/notebooks/utils.py`

## Verification

uv run --project backend python -m py_compile backend/notebooks/utils.py && uv run --project backend ruff check backend/notebooks/utils.py

## Observability Impact

Log dimensions and null counts of preprocessed dataframes.
