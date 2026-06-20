# S04: Physical Grey-Box and PINN Models — UAT

**Milestone:** M001
**Written:** 2026-06-20T15:03:45.469Z

# UAT Specification: Physical Grey-Box and PINN Models

## Preconditions
- The processed dataset is available at `backend/data/processed/` (e.g., generated during S01).
- Python environment with requirements synced (PyTorch, SciPy, Scikit-learn, Nbformat, Nbconvert).

## Automated Test Execution
Run the unit test suite:
```bash
uv run --project backend pytest backend/tests/test_physical.py -v
```

### Expected Results
- `test_simulate_and_calibrate`: 2R2C optimization converges with positive parameter values (R_i, R_o, C_i, C_h > 0).
- `test_pinn_convergence`: PyTorch PINN training executes composite loss convergence checks successfully.
- `test_notebook_execution`: The notebook `04_physical_modeling.ipynb` executes end-to-end via nbconvert with zero exceptions.

