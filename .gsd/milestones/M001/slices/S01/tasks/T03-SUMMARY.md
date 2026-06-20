---
id: T03
parent: S01
milestone: M001
key_files:
  - backend/notebooks/01_preprocessing.ipynb
  - backend/notebooks/utils.py
  - backend/data/processed/processed_heating.csv
  - backend/data/processed/processed_cooling.csv
key_decisions:
  - Use absolute path resolution (PROJECT_ROOT) inside backend/notebooks/utils.py to prevent import and path failures during notebook execution in external workspace environments.
  - Cache processed datasets under both processed_<window>.csv and <window>_processed.csv file names to accommodate all potential downstream slice conventions.
duration: 
verification_result: passed
completed_at: 2026-06-20T11:02:37.222Z
blocker_discovered: false
---

# T03: Created 01_preprocessing.ipynb teaching walkthrough notebook and cached processed heating/cooling datasets.

**Created 01_preprocessing.ipynb teaching walkthrough notebook and cached processed heating/cooling datasets.**

## What Happened

We created the Jupyter teaching notebook `01_preprocessing.ipynb` under `backend/notebooks/` containing the required sections: Introduction, load raw data, data quality overview, 15-minute alignment, feature engineering review, sanity plots, process both windows, and summary statistics. We modified the path-handling inside `backend/notebooks/utils.py` using `pathlib.Path(__file__)` to resolve paths relative to the project root, ensuring robust filesystem imports when executed within a notebook kernel. We executed the notebook end-to-end to create the cached processed datasets for both heating and cooling windows, verified all test coverage remains green, and cleaned up temporary setup files.

## Verification

Ran notebook execution using nbconvert to verify end-to-end execution success and output file creation, followed by running the python test suite.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --ExecutePreprocessor.timeout=120 --output /tmp/test_01_output.ipynb` | 0 | ✅ pass | 6487ms |
| 2 | `PYTHONPATH=. PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest backend/tests` | 0 | ✅ pass | 2895ms |

## Deviations

None. Path resolution in `utils.py` was made robust for notebook run directories.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/01_preprocessing.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/processed_cooling.csv`
