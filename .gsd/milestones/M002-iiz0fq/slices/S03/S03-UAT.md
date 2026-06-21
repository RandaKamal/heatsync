# S03: Baseline vs Smart-Control Comparison, Plots, and CSV Reports — UAT

**Milestone:** M002-iiz0fq
**Written:** 2026-06-21T11:07:09.529Z

## Preconditions

- Aligned heating and cooling processed validation datasets exist at `backend/data/processed/`
- Trained physical thermal models and device power models exist under `backend/artifacts/event_device_control/models/`
- Python dev environment is synced with `uv sync --project backend`

## UAT Type

- UAT mode: runtime-executable

## Verification Steps

1. Run the Python file compilation check:
   ```bash
   PYTHONPATH=. uv run --project backend python -m compileall backend/notebooks backend/tests
   ```
   *Expected:* Compiles with exit code 0.

2. Run the focused unit tests for comparison helpers:
   ```bash
   PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py -v
   ```
   *Expected:* All 3 tests pass successfully.

3. Run the end-to-end validation test for the control notebook:
   ```bash
   PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k "07_event_based_device_control.ipynb" -v
   ```
   *Expected:* Notebook executes cells and saves artifacts without raising exceptions.

4. Verify output files exist and are populated under `backend/artifacts/event_device_control/`:
   - Reports:
     - `reports/heating_event_control_results.csv`
     - `reports/heating_validation_timeseries.csv`
     - `reports/cooling_event_control_results.csv`
     - `reports/cooling_validation_timeseries.csv`
   - Figures:
     - `figures/heating_validation_plot.png`
     - `figures/cooling_validation_plot.png`
   *Expected:* Files exist and contain the required baseline-vs-smart columns (energy, cost, CO2, MAE, degree-minutes violation, report status).

## Quality Gates

### Q8 — Operational Readiness

- **Health Signal**: The presence of non-empty CSV and PNG artifacts under `backend/artifacts/event_device_control/reports/` and `figures/` confirms the system successfully generated validation outputs. The execution test `test_notebooks.py` provides a structured test wrapper to verify cell outputs are formatted correctly.
- **Failure Signal**: If any required validation files are missing or empty, or if exceptions are raised during notebook preprocessing, pytest will fail the validation step.
- **Recovery & Monitoring**: Run the notebook `07_event_based_device_control.ipynb` via the Jupyter interface or ExecutePreprocessor to regenerate outputs. Output paths are local; no active operational telemetry is needed.

