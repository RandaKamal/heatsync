---
id: S07
milestone: M001-992333
status: ready
---

# S07: Automated Notebook Suite Integration — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver a pytest test file (`backend/tests/test_notebooks.py`) that programmatically executes all 6 Jupyter notebooks in strict numerical order, asserting zero exceptions and reporting cell-level tracebacks on failure.

## Why this Slice

S07 is the milestone's integration proof — it demonstrates that every notebook (preprocessing, forecasting, physical modelling, anomaly detection, energy controls) runs end-to-end on the real dataset without human intervention. It depends on all prior slices (S02–S06) being complete and directly satisfies the milestone's top-level success criterion: "All 6 Jupyter notebooks run end-to-end programmatically with zero exceptions." No further slices depend on S07; it is the final gate.

## Scope

### In Scope

- A single pytest test file at `backend/tests/test_notebooks.py` using `nbconvert.preprocessors.ExecutePreprocessor` to run each notebook headlessly.
- One parametrized test function producing six separate test cases — one per notebook — so failures are isolated and individually visible.
- Strict numerical execution order (01 → 02 → 03 → 04 → 05 → 06) to satisfy the S04 → S06 `model_params.json` data dependency.
- Cell-level traceback reporting on failure, leveraging `CellExecutionError` from nbconvert.
- No explicit per-cell timeout in `ExecutePreprocessor` (`timeout=None`); timeout enforcement is deferred to pytest-timeout or CI job-level controls.
- No cleanup of generated artifacts (`model_params.json`, populated output cells) after test execution — they remain in place for inspection and dependency correctness.

### Out of Scope

- GitHub Actions CI workflow changes — the test file is run locally via `uv run --project backend pytest backend/tests/test_notebooks.py`. CI wiring is a separate concern.
- Capturing or asserting on model quality metrics (RMSE, MAPE, convergence values) — the test only asserts exception-free execution.
- Parallel notebook execution or dependency-graph-aware test ordering plugins (`pytest-order`, `pytest-dependency`).
- Notebook output cell clearing or artifact cleanup after the test suite runs.
- Performance benchmarking or execution time assertions.

## Constraints

- Must run inside the backend `uv` environment: `uv run --project backend pytest backend/tests/test_notebooks.py`.
- Requires `nbconvert` and `nbformat` as dev dependencies in `backend/pyproject.toml`.
- Requires `ipykernel` installed so `ExecutePreprocessor` can find a Python 3 kernel.
- Notebooks are expected to exist and be complete before S07 executes — S07 does not create or modify any notebook.
- The test must use kernel name `python3` (the default ipykernel).

## Integration Points

### Consumes

- `backend/notebooks/01_preprocessing.ipynb` — Preprocessing notebook (S01).
- `backend/notebooks/02_forecasting_sarimax.ipynb` — SARIMAX forecasting notebook (S02).
- `backend/notebooks/03_forecasting_lstm.ipynb` — LSTM and two-level model notebook (S03).
- `backend/notebooks/04_physical_modeling.ipynb` — 2R2C and PINN notebook (S04).
- `backend/notebooks/05_anomaly_detection.ipynb` — Anomaly detection notebook (S05).
- `backend/notebooks/06_energy_controls.ipynb` — Energy controls notebook (S06).
- `backend/notebooks/utils.py` — Shared helper module imported by all notebooks.
- `backend/data/` — Raw dataset files consumed by notebooks during execution.

### Produces

- `backend/tests/test_notebooks.py` — The automated notebook execution test file.

## Open Questions

- **Kernel discovery** — Using hardcoded `kernel_name='python3'` assumes ipykernel registers under that name in the uv environment. If it doesn't, the kernel spec name may need to be configured. Current thinking: `python3` is the ipykernel default and should work.
