---
estimated_steps: 36
estimated_files: 1
skills_used: []
---

# T03: Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.

## Why
The milestone requires automated verification. Unit tests prove 2R2C calibration converges to positive parameters and PINN training converges on real data. This mirrors the test patterns established by S02 (test_sarimax.py) and S03 (test_lstm.py) and prepares the slice for S07 suite verification.

## Do
1. Read existing test files for pattern reference:
   - `backend/tests/test_sarimax.py` — single pipeline test loading processed data.
   - `backend/tests/test_lstm.py` — model class re-definition, sequence creation, pipeline test.
2. Create `backend/tests/test_physical.py` with the following tests:
3. **`test_2r2c_calibration_positive_params()`:**
   - Load heating data via `load_processed('heating')`.
   - Select first device, extract T_in, T_out, Q columns, drop NaNs.
   - Re-implement `simulate_2r2c()` (same discrete-time equations as notebook) inside the test file.
   - Run bounded L-BFGS-B optimization with 3 random restarts (fewer than notebook for test speed), seed=42.
   - Assert optimizer converges (result.success or result.fun < reasonable threshold).
   - Assert all 4 parameters (R_in, C_in, R_out, C_wall) are > 0.
   - Assert RMSE of fitted vs observed is finite and positive.
4. **`test_pinn_convergence()`:**
   - Load heating data, select first device, extract features.
   - Re-implement the PINN model class (small MLP: 2 hidden layers, 32 neurons for test speed).
   - Define the composite loss (data_loss + physics_loss).
   - Train for 100 epochs (reduced from notebook for test speed), seed=42.
   - Assert final loss < initial loss (training improves).
   - Assert final loss is finite (no NaN/Inf).
   - Assert predictions have same length as input and are finite.
5. **`test_notebook_execution()`:**
   - Use `nbformat` and `nbconvert.preprocessors.ExecutePreprocessor` to run `backend/notebooks/04_physical_modeling.ipynb` programmatically.
   - Assert execution completes with zero exceptions.
   - Set timeout to 300 seconds.
6. Ensure the test file passes `uv run --project backend ruff check backend/tests/test_physical.py`.
7. Run the full test suite: `uv run --project backend pytest backend/tests/test_physical.py -v`.
8. Run quality gates: ruff check on both notebook and test file, plus mypy on the test file.

## Done-when
- `backend/tests/test_physical.py` exists with 3 test functions.
- `uv run --project backend pytest backend/tests/test_physical.py -v` passes all 3 tests.
- `uv run --project backend ruff check backend/tests/test_physical.py` passes.
- `uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb` passes.
- R004 is validated: 2R2C calibration produces positive R/C values, PINN converges.

## Inputs

- `backend/notebooks/04_physical_modeling.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/tests/test_lstm.py`
- `backend/tests/test_sarimax.py`

## Expected Output

- `backend/tests/test_physical.py`

## Verification

uv run --project backend pytest backend/tests/test_physical.py -v && uv run --project backend ruff check backend/tests/test_physical.py && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb
