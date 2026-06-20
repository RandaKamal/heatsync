---
id: S01
milestone: M001-992333
status: in_progress
---

# S01: Data Preprocessing and Shared Utilities — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver `backend/notebooks/utils.py` and `backend/notebooks/01_preprocessing.ipynb` that load raw CSVs, resample to a 15-minute grid, and produce clean curated dataframes usable by all downstream notebooks (S02–S06).

## Why this Slice

Every downstream slice (S02 forecasting, S03 LSTM, S04 physics models, S05 anomaly detection, S06 energy controls) imports `utils.py` for data loading and preprocessing. S01 must land first to establish the shared data contract — column names, index format, gap-fill policy, and feature set — that the rest of the notebook suite depends on.

## Scope

### In Scope

- `backend/notebooks/utils.py` with functions for CSV loading, 15-minute clock resampling, linear interpolation (≤1 hour gaps), curated column selection, time feature engineering, and Modbus alarm boolean flag.
- `backend/notebooks/01_preprocessing.ipynb` that demonstrates the preprocessing pipeline with inline summary statistics and sample plots.
- Unit tests and notebook execution integration test via pytest.

### Out of Scope

- Saving processed CSVs to disk — downstream notebooks call `utils.py` directly to preprocess from raw data each time.
- Thermal derivative features (delta-T, dT/dt, rolling averages) — built in individual downstream notebooks as needed.
- Occupancy event overlay — deferred to S06 energy controls.
- Full Modbus error register bitfield decode — deferred to S05 anomaly detection.
- Refrigerant pressures, compressor states, defrost flags, airflow percentages, and daily shutdown columns — dropped during preprocessing.

## Constraints

- Must run on Python ≥ 3.13 with dependencies from `backend/pyproject.toml` (already installed in T01).
- All timestamps are UTC. The 15-minute grid must be timezone-naive UTC datetimes.
- Raw data lives under `backend/data/` in two time-window directories; file paths must be relative to the project root or the notebooks directory.
- `utils.py` must be importable from notebook context (`backend/notebooks/`).

## Integration Points

### Consumes

- `backend/data/heating_2026-03-30_to_2026-04-05/*.csv` — raw heating-window sensor data (snapshots ~29K rows, intervals ~2.7K rows, power draw ~8K rows, space events ~16 rows).
- `backend/data/cooling_2026-05-25_to_2026-05-31/*.csv` — raw cooling-window sensor data (same file set).
- `backend/data/devices.csv` — device ID lookup (4 devices).

### Produces

- `backend/notebooks/utils.py` — shared helper module exporting: `load_and_preprocess(window: str) -> pd.DataFrame`, plus any internal helpers for resampling, interpolation, and feature engineering.
- `backend/notebooks/01_preprocessing.ipynb` — demonstration notebook showing the pipeline end-to-end with inline plots and stats.
- Processed dataframe contract (per 15-min row):
  - **Index:** `timestamp` (datetime64, UTC, 15-min aligned)
  - **Columns:** `temperature_in`, `temperature_outside`, `target_temperature`, `humidity`, `co2_ppm`, `operation_mode`, `power_draw_kw`, `has_alarm`, `hour`, `day_of_week`, `is_weekend`

## Open Questions

- **Intervals vs. snapshots as primary source** — The intervals file is already 15-min bucketed (~2.7K rows) while snapshots are raw resolution (~29K rows). Current thinking: use intervals as the primary temperature/humidity source since they are already aggregated, merge in power draw (5-min resolution, resample to 15-min), and fall back to snapshots only for columns not in intervals (e.g. error registers, outside temperature). Decide during T02 implementation.

## Key Behavioural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Multi-device aggregation | Mean sensor readings per 15-min slot; sum power draw | Single space with 4 redundant devices; averaging reduces noise |
| Time window separation | Separate dataframes per window (heating / cooling) | ~50-day gap between windows; models should not interpolate across seasons |
| Gap handling | Linear interpolation for gaps ≤ 1 hour (4 slots); NaN for longer | Short gaps are sensor blips; long gaps signal real outages downstream models should see |
| Feature engineering | Time features only (hour, day_of_week, is_weekend) | Keeps S01 thin; thermal derivatives built per-notebook |
| Error registers | Single boolean `has_alarm` column | Enough for filtering; full bitfield decode is S05's responsibility |
| Output columns | Curated core set (11 columns) | Drops 20+ internal mechanical columns unused by most notebooks |
| Persistence | No saved CSVs; downstream notebooks call `utils.py` | Single source of truth; avoids stale cached data |
