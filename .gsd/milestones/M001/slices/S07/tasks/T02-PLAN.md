---
estimated_steps: 13
estimated_files: 1
skills_used: []
---

# T02: Executed and verified the full 6-notebook test suite and completed Python quality gate checks on test_notebooks.py.

## Why
T01 created the test file; this task proves it actually works by executing the full 6-notebook suite via pytest and running all quality gates. This validates R007.

## Do
1. Run `uv run --project backend pytest backend/tests/test_notebooks.py -v` and confirm all 6 parametrized tests pass with exit code 0.
2. Run `uv run --project backend ruff check backend/tests/test_notebooks.py` — expect exit 0.
3. Run `uv run --project backend ruff format --check backend/tests/test_notebooks.py` — expect exit 0.
4. Run `MYPYPATH=backend uv run --project backend mypy backend/tests/test_notebooks.py --ignore-missing-imports` — expect exit 0.
5. If any test fails, diagnose the failure from the pytest output (notebook name, cell, exception text) and fix the test or report the issue. Do NOT fix notebook content — that belongs to prior slices.
6. Record verification evidence.

## Done-when
- All 6 notebook execution tests pass.
- Ruff and mypy checks pass.
- Verification evidence is captured with exit codes and durations.

## Inputs

- `backend/tests/test_notebooks.py`
- `backend/notebooks/01_preprocessing.ipynb`
- `backend/notebooks/02_forecasting_sarimax.ipynb`
- `backend/notebooks/03_forecasting_lstm.ipynb`
- `backend/notebooks/04_physical_modeling.ipynb`
- `backend/notebooks/05_anomaly_detection.ipynb`
- `backend/notebooks/06_energy_controls.ipynb`
- `backend/data/`

## Expected Output

- `backend/tests/test_notebooks.py`

## Verification

uv run --project backend pytest backend/tests/test_notebooks.py -v
