# S01: Data Preprocessing and Shared Utilities — UAT

**Milestone:** M001
**Written:** 2026-06-20T11:42:00.641Z

# UAT Spec for S01: Data Preprocessing and Shared Utilities

This document records the user acceptance verification for S01.

## Operational Readiness (Q8)
- **Health Signal:** Successful execution of `uv run --project backend pytest backend/tests/test_utils.py` and notebook execution with zero warnings/errors.
- **Failure Signal:** Unhandled `FileNotFoundError` or `ValueError` during data loading/validation.
- **Recovery Procedure:** Verify raw files exist in `backend/data/` with correct headers. Re-run preprocessing notebook to regenerate cached files.
- **Monitoring Gaps:** Pipeline executes on-demand, not running continuously.

## UAT-01: Reusable Preprocessing and Alignment
- **Preconditions:** Raw CSV datasets present in `backend/data/`.
- **Steps:**
  1. Load raw datasets using `load_dataset` for heating and cooling windows.
  2. Align snapshots and power draw to a 15-minute grid using `align_to_15min`.
  3. Validate interpolation metadata is captured.
  4. Build full processed datasets.
- **Expected Outcome:** DataFrames are correctly aligned to 15-minute intervals. Missing entries are imputed, with interpolation counts tracked in attributes. Time/weather/envelope features and occupancy flags are appended.
- **Evidence:** Verified by `pytest backend/tests/test_utils.py` passing 18/18 checks.

## UAT-02: Walkthrough Notebook and Caching
- **Preconditions:** Preprocessing utilities and raw data present.
- **Steps:**
  1. Execute `01_preprocessing.ipynb` programmatically via nbconvert.
- **Expected Outcome:** Run completes with exit code 0. Notebook generates output cells showing aligned dataset diagnostics and writes files to `backend/data/processed/`.
- **Evidence:** Executed via `nbconvert` with exit code 0 and files generated.

