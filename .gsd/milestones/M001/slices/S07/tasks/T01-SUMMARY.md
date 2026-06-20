---
id: T01
parent: S07
milestone: M001
key_files:
  - backend/tests/test_notebooks.py
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-06-20T16:09:33.195Z
blocker_discovered: false
---

# T01: Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks

**Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks**

## What Happened

Created the test file `backend/tests/test_notebooks.py` to programmatically run all six HeatSync Jupyter notebooks in sequence. It imports `nbformat` and `ExecutePreprocessor` (with type ignores where necessary) to execute the notebooks end-to-end. A timeout of 600 seconds is applied per notebook to accommodate the LSTM and PINN model training runs.

### Q5 — Failure Modes
- Filesystem failure: If the target notebook file is missing, the assertion `assert os.path.exists(...)` will fail immediately with a clear error message.
- Timeout failure: Executing heavy workloads (SARIMAX, LSTM, PINN training) might take a long time. We configure a generous timeout (600s) to prevent hanging.
- Execution error: If any cell in a notebook throws an exception, `CellExecutionError` is caught and pytest fails, printing the traceback.

### Q6 — Load Profile
- Resource saturation: Running 6 ML/statistical notebooks sequentially takes significant CPU/Memory (mostly training LSTM and PINN models).
- Protection: The tests are parametrized and run sequentially rather than in parallel, avoiding high memory/CPU spike overhead. Timeout limits execution duration.

### Q7 — Negative Tests
- Scenario protection: Protected by verifying notebook existence via path assertion. Checked that cell failures are captured and surfaced cleanly using pytest assertion formatting and CellExecutionError wrapper.

## Verification

Successfully verified by running pytest on the new test suite. All 6 notebooks executed sequentially and passed without errors in 63.69 seconds. Ruff formatting, ruff lint checks, python compilation checks, and mypy type checks all passed cleanly.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_notebooks.py` | 0 | ✅ pass | 64307ms |
| 2 | `uv run --project backend ruff check backend/tests/test_notebooks.py` | 0 | ✅ pass | 122ms |
| 3 | `uv run --project backend mypy --ignore-missing-imports backend/tests/test_notebooks.py` | 0 | ✅ pass | 4877ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/tests/test_notebooks.py`
