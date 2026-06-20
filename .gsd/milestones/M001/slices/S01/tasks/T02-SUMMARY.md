---
id: T02
parent: S01
milestone: M001
key_files:
  - backend/tests/test_utils.py
key_decisions:
  - Use pytest's tmp_path fixture for verifying processed CSV save/load functionality to avoid polluting the workspace.
duration: 
verification_result: passed
completed_at: 2026-06-20T10:55:07.725Z
blocker_discovered: false
---

# T02: Implemented comprehensive pytest coverage for preprocessing utilities in test_utils.py.

**Implemented comprehensive pytest coverage for preprocessing utilities in test_utils.py.**

## What Happened

Created `backend/tests/test_utils.py` and wrote detailed unit and integration tests covering the utility loading functions for all files (snapshots, intervals, power draw, and space events). Implemented tests for `align_to_15min`, both dataset building functions (`build_aligned_dataset` for heating and cooling), round-trip serialization/deserialization via `save_processed` and `load_processed` using pytest's `tmp_path`, occupancy flag logic verification, and input validation checks including negative scenarios. Verified that all tests run and pass cleanly via pytest and ruff check linting.

## Verification

Ran `uv run --project backend pytest backend/tests/test_utils.py -v` and `uv run --project backend ruff check --config backend/pyproject.toml backend/tests/test_utils.py`; all tests passed and no lint issues remained.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_utils.py -v && uv run --project backend ruff check --config backend/pyproject.toml backend/tests/test_utils.py` | 0 | ✅ pass | 2201ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/tests/test_utils.py`
