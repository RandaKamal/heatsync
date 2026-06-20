---
id: T03
parent: S04
milestone: M001
key_files:
  - backend/tests/test_physical.py
key_decisions:
  - Delegated data processing in test_pinn_convergence to helper function to resolve Ruff statement complexity checks
  - Added type-ignore annotations for untyped library imports (scipy, sklearn, nbconvert) to satisfy Mypy
duration: 
verification_result: passed
completed_at: 2026-06-20T15:01:01.739Z
blocker_discovered: false
---

# T03: Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.

**Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.**

## What Happened

Created `backend/tests/test_physical.py` containing a comprehensive test suite that validates physical gray-box thermal models, PINN convergence, and notebook correctness:
1. `test_2r2c_calibration_positive_params`: Loads heating dataset, runs multi-start L-BFGS-B calibration (3 restarts) to ensure converged values are positive and produce finite indoor temperature predictions with positive RMSE.
2. `test_pinn_convergence`: Trains a multi-layer PINN using composite loss (indoor temperature MSE and heat equation physics residual) and asserts training loss decreases and predictions are finite.
3. `test_notebook_execution`: Uses `nbformat` and `ExecutePreprocessor` to execute `04_physical_modeling.ipynb` end-to-end to guarantee it remains bug-free.

All tests pass cleanly. Both `ruff check` and `mypy` verify code quality and type safety on the new test file.

### Failure Modes (Q5)
- File Access Failures: The dataset file loading handles missing files by raising `FileNotFoundError`, which is correctly caught and reported by pytest.
- Notebook Execution Failures: Any runtime errors or exceptions thrown inside the notebook during programmatic execution will fail the `test_notebook_execution` test, preventing regressions from sliding into production.

### Load Profile (Q6)
- The L-BFGS-B optimization is limited to 3 restarts and 100 max iterations in the unit test, and the PINN is trained for 100 epochs, keeping the test execution time to under 20 seconds.

### Negative Tests (Q7)
- Negative Parameter Guards: The `simulate_2r2c` function enforces strict positive bounds and raises `ValueError` if non-positive parameters are supplied.
- Instability Protection: High or infinite temperature predictions during simulation trigger early-exit guards, preventing the optimizer from hanging on unstable models.

## Verification

Ran uv run --project backend pytest backend/tests/test_physical.py -v (passed 3/3 tests), uv run --project backend ruff check backend/tests/test_physical.py (0 errors), and uv run --project backend mypy backend/tests/test_physical.py (0 errors).

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_physical.py -v` | 0 | ✅ pass | 17000ms |
| 2 | `uv run --project backend ruff check backend/tests/test_physical.py` | 0 | ✅ pass | 500ms |
| 3 | `uv run --project backend mypy backend/tests/test_physical.py` | 0 | ✅ pass | 1000ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/tests/test_physical.py`
