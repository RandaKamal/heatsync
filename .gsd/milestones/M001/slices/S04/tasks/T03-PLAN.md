---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Implemented unit tests for 2R2C calibration, PINN convergence, and programmatic notebook execution.

## Inputs

- None specified.

## Expected Output

- `backend/tests/test_physical.py`

## Verification

uv run --project backend pytest backend/tests/test_physical.py -v && uv run --project backend ruff check backend/tests/test_physical.py && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb
