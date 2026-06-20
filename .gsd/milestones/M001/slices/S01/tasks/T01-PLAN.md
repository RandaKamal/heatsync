---
estimated_steps: 19
estimated_files: 3
skills_used: []
---

# T01: Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.

**Why:** Every downstream notebook (S02–S06) needs consistent CSV loading, 15-minute clock alignment, interpolation tracking, and feature engineering. Centralizing this in utils.py prevents duplication and ensures all slices work from the same preprocessed data.

**Do:**
1. Create `backend/notebooks/` directory and `backend/notebooks/__init__.py`.
2. Create `backend/notebooks/utils.py` with these functions:
   - `load_snapshots(window: str) -> pd.DataFrame` — Load heat_pump_snapshots.csv from `backend/data/{heating_2026-03-30_to_2026-04-05,cooling_2026-05-25_to_2026-05-31}/`, parse `last_seen_at` as datetime index. Window parameter selects 'heating' or 'cooling'.
   - `load_intervals(window: str) -> pd.DataFrame` — Load heat_pump_intervals.csv, parse `interval_start_time` as datetime index.
   - `load_power_draw(window: str) -> pd.DataFrame` — Load power_draw.csv, parse `timestamp` as datetime.
   - `load_space_events(window: str) -> pd.DataFrame` — Load space_events.csv, parse `starts_at`/`ends_at` as datetime.
   - `WINDOW_DIRS: dict[str, str]` — Maps 'heating' to 'backend/data/heating_2026-03-30_to_2026-04-05' and 'cooling' to 'backend/data/cooling_2026-05-25_to_2026-05-31'.
   - `align_to_15min(df: pd.DataFrame, timestamp_col: str, agg: str = 'mean') -> pd.DataFrame` — Resample to 15-minute intervals using provided aggregation. Track and return interpolation/fill metadata.
   - `build_aligned_dataset(window: str) -> tuple[pd.DataFrame, dict]` — Master function that loads all sources, aligns snapshots and power_draw to 15-min grid, merges with intervals, adds occupancy flags from space_events, engineers time features (hour_of_day, day_of_week, is_weekend) and weather features (outside_temperature from snapshots), returns (aligned_df, quality_report_dict).
   - `save_processed(df: pd.DataFrame, window: str, output_dir: str = 'backend/data/processed') -> pathlib.Path` — Save aligned DataFrame as CSV.
   - `load_processed(window: str, output_dir: str = 'backend/data/processed') -> pd.DataFrame` — Load cached processed CSV.
3. Required CSV columns for each file type should be validated on load; raise ValueError with file name and missing column names. Optional columns that are absent should log a warning.
4. Conservative alignment: use mean aggregation for numeric columns during 15-min resampling of snapshots; forward-fill for short gaps (≤2 intervals = 30 min), flag longer gaps. Track per-column interpolation counts in the quality report dict.
5. Occupancy flag: for each 15-min interval, set `occupancy_flag=1` if any space_event overlaps that interval, else 0.
6. Create `backend/data/processed/` directory (with .gitkeep).

**Done-when:** utils.py exists, imports without error, passes ruff check and ruff format, and mypy type-checks cleanly.

**Skills:** python_acoustic_vessel, code_writing_behavior

## Inputs

- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_intervals.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/power_draw.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/space_events.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_snapshots.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_intervals.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/power_draw.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/space_events.csv`
- `backend/data/devices.csv`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/notebooks/__init__.py`
- `backend/data/processed/.gitkeep`

## Verification

uv run --project backend python -c "import notebooks.utils; print('import ok')" && uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py
