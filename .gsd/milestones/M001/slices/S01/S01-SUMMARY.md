---
id: S01
parent: M001
milestone: M001
provides:
  - backend/notebooks/utils.py shared helpers
  - backend/data/processed/ processed dataframes
requires:
  []
affects:
  []
key_files:
  - backend/notebooks/utils.py
  - backend/notebooks/01_preprocessing.ipynb
  - backend/tests/test_utils.py
  - backend/data/processed/processed_heating.csv
  - backend/data/processed/processed_cooling.csv
key_decisions:
  - Use pandas DataFrame.attrs for interpolation metadata from align_to_15min while returning a DataFrame, preserving the required public return shape.
  - Bubble filesystem and CSV contract failures with explicit FileNotFoundError or ValueError messages rather than hiding bad input data.
  - Use tmp_path fixture for verifying processed CSV save/load functionality to avoid polluting workspace.
  - Use absolute path resolution (PROJECT_ROOT) inside backend/notebooks/utils.py to prevent path failures during notebook execution in external environments.
  - Cache processed datasets under both processed_<window>.csv and <window>_processed.csv file names to accommodate all potential downstream slice conventions.
  - Preserve existing pytest root behavior while adding the repository root to pytest pythonpath so full-suite tests can import backend.* modules.
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-06-20T11:42:00.641Z
blocker_discovered: false
---

# S01: Data Preprocessing and Shared Utilities

**Delivered shared preprocessing utilities and walkthrough notebook caching aligned 15-minute datasets.**

## What Happened

S01 successfully implemented, tested, and verified the data preprocessing foundations for the HeatSync modeling and controls notebooks. We delivered backend/notebooks/utils.py which loads raw snap, interval, and power CSVs for both heating and cooling windows, aligns snapshots and power_draw to a 15-minute clock via downsampling, engineers weather, time, and envelope features, and maps space events to 15-minute occupancy flags. We tracked column-wise interpolation counts via DataFrame attributes. Unit and integration tests were written in backend/tests/test_utils.py, achieving robust pytest coverage for all utils.py functions. 01_preprocessing.ipynb was built as a teaching walkthrough illustrating alignment and gap analysis. The notebook executes end-to-end without errors and caches processed datasets in backend/data/processed/ under both processed_<window>.csv and <window>_processed.csv formats.

## Verification

Verified that unit tests pass (18 passed), ruff and mypy quality gates pass with zero issues, and the preprocessing notebook executes end-to-end successfully via nbconvert to generate the cached processed datasets.

## Requirements Advanced

None.

## Requirements Validated

- R001 — Verified via unit tests in backend/tests/test_utils.py and programmatic notebook execution of backend/notebooks/01_preprocessing.ipynb.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `backend/notebooks/utils.py` — Shared utility module for preprocessing and alignment
- `backend/notebooks/01_preprocessing.ipynb` — Walkthrough notebook for data preprocessing
- `backend/tests/test_utils.py` — Unit tests for preprocessing utilities
- `backend/notebooks/__init__.py` — Directory package marker
- `backend/data/processed/processed_cooling.csv` — Output cache file for processed cooling data
- `backend/data/processed/processed_heating.csv` — Output cache file for processed heating data
- `backend/data/processed/cooling_processed.csv` — Alternative name output cache file for processed cooling data
- `backend/data/processed/heating_processed.csv` — Alternative name output cache file for processed heating data
