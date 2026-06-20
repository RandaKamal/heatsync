---
estimated_steps: 15
estimated_files: 1
skills_used: []
---

# T03: Create 01_preprocessing.ipynb teaching notebook

**Why:** The preprocessing notebook is the primary deliverable users interact with. It must demonstrate the full raw-to-aligned pipeline as a readable walkthrough and cache processed artifacts for downstream notebooks.

**Do:**
1. Create `backend/notebooks/01_preprocessing.ipynb` as a Jupyter notebook with these sections:
   - **Section 1: Introduction** — Brief description of the HeatSync dataset, what preprocessing does, and what the notebook produces.
   - **Section 2: Load Raw Data** — Use utils.py helpers to load all 4 CSV types for the heating window. Display `.head()`, `.shape`, `.dtypes`, date ranges for each raw DataFrame.
   - **Section 3: Data Quality Overview** — Show missing value counts per column, duplicate timestamp check, raw row counts per file, source date ranges.
   - **Section 4: 15-Minute Alignment** — Call `build_aligned_dataset('heating')` to produce the aligned DataFrame. Show before/after row counts, display the quality report dict (interpolation counts, fill counts, gap flags).
   - **Section 5: Feature Engineering Review** — Show the engineered columns: hour_of_day, day_of_week, is_weekend, occupancy_flag, outside_temperature. Display sample rows and value distributions.
   - **Section 6: Alignment Sanity Plots** — Plot temperature time series (raw vs aligned), power draw overlay, occupancy flag timeline. Use matplotlib.
   - **Section 7: Process Both Windows** — Run build_aligned_dataset for both heating and cooling windows. Save via `save_processed()`. Show final shapes and column lists.
   - **Section 8: Summary** — Print final coverage statistics: rows per window, date ranges, column count, total interpolated values.
2. Ensure the notebook is runnable end-to-end programmatically (no interactive widgets or manual inputs).
3. Use clear markdown headers and explanatory text between code cells.

**Done-when:** The notebook exists with all sections, and `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --output /dev/null` completes with exit code 0.

**Skills:** write-docs, python_acoustic_vessel

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_intervals.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/power_draw.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/space_events.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_snapshots.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_intervals.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/power_draw.csv`
- `backend/data/cooling_2026-05-25_to_2026-05-31/space_events.csv`

## Expected Output

- `backend/notebooks/01_preprocessing.ipynb`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/processed_cooling.csv`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --ExecutePreprocessor.timeout=120 --output /tmp/test_01_output.ipynb
