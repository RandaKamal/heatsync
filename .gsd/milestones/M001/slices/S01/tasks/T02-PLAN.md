---
estimated_steps: 17
estimated_files: 1
skills_used: []
---

# T02: Implemented comprehensive pytest coverage for preprocessing utilities in test_utils.py.

**Why:** utils.py is the shared foundation for 6 downstream notebooks. Automated tests catch regressions early and prove the alignment, feature engineering, and error handling contracts.

**Do:**
1. Create `backend/tests/test_utils.py` with pytest tests covering:
   - `test_load_snapshots_heating` — loads heating snapshots, checks expected columns (device_id, status_temperature_in_celsius, last_seen_at), confirms non-empty DataFrame.
   - `test_load_snapshots_invalid_window` — passing an invalid window raises ValueError.
   - `test_load_intervals_heating` — loads intervals, checks expected columns, row count is reasonable.
   - `test_load_power_draw_cooling` — loads cooling power_draw, checks device_id and power_draw_kw columns.
   - `test_load_space_events` — loads events, checks starts_at/ends_at are datetime.
   - `test_align_to_15min` — takes a small synthetic DataFrame with irregular timestamps, aligns to 15-min, asserts output has expected 15-min frequency.
   - `test_build_aligned_dataset_heating` — builds full aligned dataset for heating window, checks key columns exist (hour_of_day, day_of_week, is_weekend, occupancy_flag, outside_temperature), checks quality report dict has interpolation counts.
   - `test_build_aligned_dataset_cooling` — same for cooling window.
   - `test_save_and_load_processed` — saves a processed DataFrame, loads it back, checks round-trip equality (using tmp_path fixture for output dir).
   - `test_occupancy_flag` — verifies occupancy_flag is 1 during event periods, 0 outside.
2. Tests should use real data from backend/data/ where practical for integration coverage.
3. All tests must pass with `uv run --project backend pytest backend/tests/test_utils.py -v`.

**Done-when:** All tests pass, ruff check and format pass on the test file.

**Skills:** test-engineer, python-testing

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_intervals.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/power_draw.csv`
- `backend/data/heating_2026-03-30_to_2026-04-05/space_events.csv`

## Expected Output

- `backend/tests/test_utils.py`

## Verification

uv run --project backend pytest backend/tests/test_utils.py -v && uv run --project backend ruff check --config backend/pyproject.toml backend/tests/test_utils.py
