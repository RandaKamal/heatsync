---
id: T01
parent: S01
milestone: M001
key_files:
  - backend/notebooks/utils.py
  - backend/notebooks/__init__.py
  - backend/data/processed/.gitkeep
  - backend/tests/test_utils.py
key_decisions:
  - Use pandas DataFrame.attrs for interpolation metadata from align_to_15min while returning a DataFrame, preserving the required public return shape.
  - Bubble filesystem and CSV contract failures with explicit FileNotFoundError or ValueError messages rather than hiding bad input data.
duration: 
verification_result: passed
completed_at: 2026-06-20T10:52:01.303Z
blocker_discovered: false
---

# T01: Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.

**Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.**

## What Happened

`backend/notebooks/utils.py` now provides the shared preprocessing API required by downstream notebook slices: window-aware raw CSV loaders with required-column validation, optional-column warnings, conservative 15-minute resampling, short-gap forward filling, long-gap flags, `build_aligned_dataset()`, `save_processed()`, and `load_processed()`. `backend/notebooks/__init__.py` makes the notebook helpers importable as the `notebooks` package, and `backend/data/processed/.gitkeep` preserves the processed-cache directory.

The implementation uses filesystem-backed CSV reads under `backend/data/{heating_2026-03-30_to_2026-04-05,cooling_2026-05-25_to_2026-05-31}`, parses the planned timestamp columns, validates the known contracts on load, and raises actionable errors for unknown windows, missing required columns, and missing processed caches. Tests in `backend/tests/test_utils.py` cover the successful loader paths, required-column failures, optional-column warning path, unknown-window rejection, 15-minute interpolation and long-gap flag behavior, aligned dataset construction, and processed-cache save/load.

## Failure Modes

- Filesystem or missing-cache dependency: `load_processed()` explicitly checks for the processed CSV and raises `FileNotFoundError` with the missing path; covered by `test_load_processed_raises_for_missing_cache`.
- Malformed CSV/data-contract dependency: `validate_columns()` raises `ValueError` naming the file type/path and missing required columns; covered by `test_validate_columns_raises_on_missing_required` for snapshots, intervals, power draw, and space events.
- Unknown window selector: all load/build entry points reject invalid windows with `ValueError`; covered by `test_window_validation_rejects_unknown_window`.
- Optional schema drift: absent optional columns emit warnings rather than silently disappearing; covered by `test_validate_columns_warns_on_missing_optional`.
- Long telemetry gaps: alignment flags gaps longer than 30 minutes instead of filling them; covered by `test_align_to_15min_resampling_and_imputation`.

## Load Profile

The task processes bounded teaching-window CSV files locally with pandas. The first 10x saturation point would be memory during `build_aligned_dataset()` because snapshots and power draw are aligned and outer-merged in memory across devices. The protection for the expected dataset scale is conservative resampling by device and processed CSV caching via `save_processed()` / `load_processed()` so downstream notebooks can reuse cached aligned data instead of rebuilding on every cell run. No network, subprocess, API, or unbounded service runtime is introduced by this utility module.

## Negative Tests

- Missing required snapshot, interval, power draw, and space-event columns: `backend/tests/test_utils.py::test_validate_columns_raises_on_missing_required`.
- Missing optional power draw column warning: `backend/tests/test_utils.py::test_validate_columns_warns_on_missing_optional`.
- Unknown window values for every public loader/build function: `backend/tests/test_utils.py::test_window_validation_rejects_unknown_window`.
- Short versus long alignment gaps: `backend/tests/test_utils.py::test_align_to_15min_resampling_and_imputation` asserts a 15-minute short gap is filled and a longer gap remains null with a gap flag.
- Missing processed cache: `backend/tests/test_utils.py::test_load_processed_raises_for_missing_cache`.

## Observability Impact

The utility exposes data-quality diagnostics through returned quality reports and DataFrame interpolation metadata. Optional-column drift is visible through `logging.warning()` and `UserWarning`, while long gaps are persisted as per-column `_gap_flag` fields and summarized in the `quality_report` dictionaries returned by `build_aligned_dataset()`.

## Verification

Fresh closure verification ran the task-required import, Ruff check, and Ruff format check, plus mypy and the targeted utility test suite. The combined command exited 0. Output showed `import ok`, Ruff success, mypy success, and `15 passed` for `backend/tests/test_utils.py`. Pytest emitted expected optional-column warnings for real CSVs where optional snapshot columns are absent, confirming the warning path is exercised rather than a failure.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend python -c "import notebooks.utils; print('import ok')" && uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py && uv run --project backend mypy --config-file backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend pytest backend/tests/test_utils.py` | 0 | ✅ pass | 3238ms |

## Deviations

No functional deviations from the task contract. The artifacts were already present in the active source context; execution focused on validating the implementation, tests, and quality gates rather than overwriting working files.

## Known Issues

Pytest reports optional-column warnings for absent real snapshot optional fields. This is expected behavior required by the task and covered by tests; it is not a failing issue.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/notebooks/__init__.py`
- `backend/data/processed/.gitkeep`
- `backend/tests/test_utils.py`
