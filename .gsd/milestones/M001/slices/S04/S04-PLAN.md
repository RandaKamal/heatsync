# S04: Physical Grey-Box and PINN Models

**Goal:** Create backend/notebooks/04_physical_modeling.ipynb that calibrates a 2R2C grey-box thermal model to positive physical parameters using bounded scipy L-BFGS-B optimization and demonstrates PyTorch PINN training with data MSE + heat-equation residual loss showing convergence. Verify via unit tests and programmatic notebook execution.
**Demo:** Runs 04_physical_modeling.ipynb showing 2R2C calibration with positive R/C values and PINN training convergence.

## Must-Haves

- `04_physical_modeling.ipynb` runs end-to-end programmatically via nbconvert with zero exceptions.
- 2R2C calibration produces all-positive R and C parameter values.
- 2R2C optimizer reports convergence status and fitted-vs-observed comparison.
- PINN training loop runs to completion with decreasing/stabilized loss curve.
- `backend/tests/test_physical.py` passes with `uv run --project backend pytest backend/tests/test_physical.py -v`.
- `uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb` and `uv run --project backend ruff check backend/tests/test_physical.py` produce zero errors.

## Proof Level

- This slice proves: Unit tests verify 2R2C positive parameters and PINN convergence on real data. Programmatic notebook execution via nbconvert confirms zero-exception end-to-end run. Ruff linting confirms code quality.

## Integration Closure

S04 consumes `backend/notebooks/utils.py` (`load_processed`) and `backend/data/processed/` CSVs from S01. S04 produces `04_physical_modeling.ipynb` which downstream S06 (energy controls) depends on for physical-model understanding, and S07 (suite verification) will execute. No new shared helpers are added to utils.py; physical-model equations stay notebook-local per sketch scope.

## Verification

- None — notebook-only slice with no runtime services.

## Tasks

- [x] **T01: Created 04_physical_modeling.ipynb with discrete 2R2C thermal circuit calibration using bounded L-BFGS-B** `est:Large (60-90 min)`
  ## Why
  R004 requires calibrating a 2R2C grey-box model with positive R and C values. The 2R2C model is the primary physical-model proof for this slice and the milestone success criterion. This task builds the notebook foundation (imports, data loading, physical input selection) and the complete 2R2C calibration section.
  - Files: `backend/notebooks/04_physical_modeling.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

- [x] **T02: Added PyTorch PINN sections to 04_physical_modeling.ipynb with composite loss and verified convergence.** `est:Large (60-90 min)`
  ## Why
  R004 requires constructing a Physics-Informed Neural Network (PINN) in PyTorch. The PINN demonstrates integrating physical laws (heat equation residual) with neural network training. This is the second major proof for the slice.
  - Files: `backend/notebooks/04_physical_modeling.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

- [x] **T03: Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.** `est:Medium (30-45 min)`
  ## Why
  The milestone requires automated verification. Unit tests prove 2R2C calibration converges to positive parameters and PINN training converges on real data. This mirrors the test patterns established by S02 (test_sarimax.py) and S03 (test_lstm.py) and prepares the slice for S07 suite verification.
  - Files: `backend/tests/test_physical.py`
  - Verify: uv run --project backend pytest backend/tests/test_physical.py -v && uv run --project backend ruff check backend/tests/test_physical.py && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb

## Files Likely Touched

- backend/notebooks/04_physical_modeling.ipynb
- backend/tests/test_physical.py
