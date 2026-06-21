# S04: Physical Grey-Box and PINN Models

**Goal:** Create backend/notebooks/04_physical_modeling.ipynb that calibrates a 2R2C grey-box thermal model to positive physical parameters using bounded scipy L-BFGS-B optimization and demonstrates PyTorch PINN training with data MSE + heat-equation residual loss showing convergence. Verify via unit tests and programmatic notebook execution.
**Demo:** Runs 04_physical_modeling.ipynb showing 2R2C calibration with positive R/C values and PINN training convergence.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Created 04_physical_modeling.ipynb with discrete 2R2C thermal circuit calibration using bounded L-BFGS-B**
  - Files: `backend/notebooks/04_physical_modeling.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

- [x] **T02: Added PyTorch PINN sections to 04_physical_modeling.ipynb with composite loss and verified convergence.**
  - Files: `backend/notebooks/04_physical_modeling.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

- [x] **T03: Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.**
  - Files: `backend/tests/test_physical.py`
  - Verify: uv run --project backend pytest backend/tests/test_physical.py -v && uv run --project backend ruff check backend/tests/test_physical.py && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

## Files Likely Touched

- backend/notebooks/04_physical_modeling.ipynb
- backend/tests/test_physical.py
