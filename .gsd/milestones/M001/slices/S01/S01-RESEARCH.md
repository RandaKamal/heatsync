# S01: Data Preprocessing and Shared Utilities — Research

**Date:** 2026-06-20

## Summary
The goal of Slice S01 is to establish a shared utility module (`backend/notebooks/utils.py`) and a teaching-oriented Jupyter notebook (`01_preprocessing.ipynb`) to clean, align, and engineer features on raw HeatSync datasets. We must process raw datasets representing two major operation windows (heating/cooling):
- Snapshot data: high-frequency raw heat pump readings (`heat_pump_snapshots.csv`).
- Interval data: 15-minute aggregated data (`heat_pump_intervals.csv`).
- Power draw data: high-frequency current power readings (`power_draw.csv`).
- Space events: building events/occupancy periods (`space_events.csv`).

These files live under `backend/data/heating_2026-03-30_to_2026-04-05/` and `backend/data/cooling_2026-05-25_to_2026-05-31/`. The utilities should normalize datasets onto a 15-minute grid using conservative alignment. Any imputation (e.g. forward filling, linear interpolation) must be counted and surfaced to downstream consumers. In addition to basic cleaning, time-based features (e.g. hour of day, day of week), weather-based features (e.g. outdoor temperature, humidity), and envelope-related features must be engineered.

## Recommendation
We should write a robust, modular helper script `backend/notebooks/utils.py` that loads raw datasets directly using `pandas.read_csv`, parses timestamps to datetime indices, performs clock alignment using pandas resampling (`resample('15Min')` or similar depending on data resolution), and imputes missing fields with deterministic rules (e.g. forward fill for short gaps, flags for missing segments). The engineered features (envelope thermal status, weather indicators, occupancy indicators from events) must be joined onto the 15-minute grid. The notebook `01_preprocessing.ipynb` will serve as the runnable tutorial illustrating coverage metrics and gap counts. A deterministic processed DataFrame artifact must be cached (e.g. at `backend/data/processed/processed_data.parquet` or `.csv`) to serve as the unified source of truth for slices S02-S06.

## Implementation Landscape

### Key Files
- `backend/notebooks/utils.py` — Shared helper module for CSV loading, timezone-aware timestamp normalization, conservative 15-minute alignment, interpolation, and time/weather/envelope feature extraction.
- `backend/notebooks/01_preprocessing.ipynb` — Teaching-oriented notebook illustrating the raw-to-aligned pipeline, showing gap metrics, interpolation statistics, and simple sanity plots.
- `backend/data/processed/` — Directory containing the generated final processed DataFrame artifacts (e.g., `processed_heating.csv`, `processed_cooling.csv`) or single concatenated table.

### Build Order
1. **Shared Helpers (`backend/notebooks/utils.py`)**: Implement robust file loading, 15-minute clock resampling, and feature engineering. This unblocks all downstream modeling slices (S02-S06).
2. **Notebook Execution (`backend/notebooks/01_preprocessing.ipynb`)**: Write the interactive walkthrough consuming the helpers and showcasing coverage plots and gap statistics.
3. **Save Cache Artifacts**: Ensure the notebook runs programmatically and outputs standard cached files under `backend/data/processed/`.

### Verification Approach
- Ensure `01_preprocessing.ipynb` executes end-to-end without errors.
- Confirm the generated processed dataset exists and matches the expected columns (e.g., resampled timestamps, imputed variables, engineered features like `hour_of_day`, `outside_temperature`, `occupancy_flag`).
- Validate behavior using Behave step definitions in a later task once S01 code is fully written.

## Constraints
- Shared utility must be placed exactly at `backend/notebooks/utils.py` per decision D001.
- All Python code and notebooks must live in `backend/`.
- No silent failures: schema or required file errors must raise explicit exceptions immediately.

## Common Pitfalls
- **Mismatch between datetime frequencies**: Snapshots are high-frequency, whereas intervals are already 15-minute aligned. Merging them requires careful downsampling of snapshots (e.g. taking mean or median over the 15-minute block) and aligning start times.
- **Timezone/DST shifts**: Datetime parsing must remain timezone-naive or use UTC consistently to avoid off-by-one errors in feature engineering.

## Skills Discovered
| Technology | Skill | Status |
|------------|-------|--------|
| API Design | api-design | available |
| Decompose Slices | decompose-into-slices | available |
| Interface Design | design-an-interface | available |
| Grill Me | grill-me | available |
| Write Docs | write-docs | available |
