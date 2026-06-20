---
id: S07
milestone: M001
status: ready
---

# S07: Automated Notebook Suite Verification — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create an automated backend test that executes all six notebooks programmatically, verifies milestone-critical outputs are present, and reports actionable failures without turning the suite into a full evaluation framework.

## Why this Slice

This slice comes after S02-S06 because it integrates the completed notebook suite and proves the milestone can run end-to-end from preprocessing through forecasting, physical modeling, anomaly detection, and controls. It provides the final automated confidence that the notebooks execute reliably and expose the expected evidence artifacts for humans and future agents to inspect.

## Scope

### In Scope

- Build `backend/tests/test_notebooks.py` to execute all six milestone notebooks programmatically.
- Run notebooks in dependency and milestone order, from preprocessing through controls, while keeping kernel state isolated per notebook.
- Verify that each notebook runs to completion with zero uncaught exceptions.
- Assert presence of milestone-critical outputs without enforcing research-grade model quality thresholds.
- Check that SARIMAX and LSTM notebooks visibly produce RMSE and MAPE outputs.
- Check that the physical-modeling notebook visibly produces positive 2R2C resistance and capacitance parameters.
- Check that the anomaly-detection notebook visibly produces anomaly timestamp output and Modbus alarm context when available.
- Check that the controls notebook visibly produces setback scenario outputs and estimated HVAC kWh savings.
- Provide actionable pytest failures that identify the notebook path/name, failed cell or execution step, exception text, and relevant diagnostic context.
- Expect bounded deterministic notebook behavior, including fixed seeds and limited training/tuning work for LSTM, PINN, and Autoencoder examples.
- Keep successful verification runs clean by relying on pytest output, temporary logs, or lightweight captured artifacts rather than writing noisy executed notebooks into the repository by default.

### Out of Scope

- Creating a model leaderboard or enforcing that LSTM beats SARIMAX, PINN beats 2R2C, or any model meets a strict accuracy threshold.
- Research-grade regression testing of metric ranges, anomaly counts, parameter sensitivity, or savings values.
- Building an evaluation dashboard or stakeholder report summarizing all model results beyond the test outputs needed for verification.
- Reimplementing notebook logic inside tests instead of executing notebooks and checking their visible outputs.
- Saving executed notebook copies as persistent artifacts by default.
- Testing production deployment, model registries, monitoring systems, live controls, or external services.
- Replacing slice-specific tests or quality gates for utilities; S07 is the notebook-suite acceptance gate.

## Constraints

- S07 depends on S02, S03, S04, S05, and S06, and implicitly on S01 as the shared data foundation for every notebook.
- Tests and Python-specific verification code must live under `backend/`, with `backend/tests/test_notebooks.py` as the roadmap target.
- Backend checks should run through the backend `uv` project environment and pytest, consistent with repository instructions.
- The milestone requires all six Jupyter notebooks to run end-to-end programmatically with zero exceptions.
- The milestone requires forecasting metrics, positive 2R2C parameters, anomaly outputs, Modbus alarm context, and controls savings estimates to be visible enough for automated checks.
- Notebook tests should avoid hidden cross-notebook in-memory state; any shared data must come from explicit files or helpers such as S01 processed artifacts and `backend/notebooks/utils.py`.
- Heavy notebook sections should be bounded and deterministic enough to avoid flaky CI or local test runs.
- Failure output should be useful to the next developer or agent without requiring manual notebook spelunking first.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared helpers used by notebooks under test and, if appropriate, by tests to locate processed data or expected output markers.
- `backend/notebooks/01_preprocessing.ipynb` — Preprocessing notebook that establishes the aligned dataframe and shared data foundation.
- `backend/notebooks/02_forecasting_sarimax.ipynb` — SARIMAX notebook expected to execute and expose RMSE/MAPE outputs.
- `backend/notebooks/03_forecasting_lstm.ipynb` — LSTM notebook expected to execute and expose base and/or residual forecasting metrics.
- `backend/notebooks/04_physical_modeling.ipynb` — Physical-modeling notebook expected to execute and expose positive 2R2C parameters plus PINN convergence evidence.
- `backend/notebooks/05_anomaly_detection.ipynb` — Anomaly notebook expected to execute and expose suspicious timestamp outputs and alarm context.
- `backend/notebooks/06_energy_controls.ipynb` — Controls notebook expected to execute and expose setback scenario savings estimates.
- `backend/data/` and S01 processed-data artifacts — Data inputs required by notebooks during automated execution.

### Produces

- `backend/tests/test_notebooks.py` — Pytest-based automated notebook suite verification that executes all six notebooks and checks key output presence.
- Pytest failure diagnostics — Actionable failure messages identifying the affected notebook, failed cell or step, exception summary, and diagnostic context.
- Temporary execution logs or artifacts when needed — Lightweight debug evidence for failed runs without committing executed notebook outputs by default.

## Open Questions

- Which notebook execution mechanism should be used? — Current thinking: choose the simplest backend-compatible tool during implementation, such as a pytest-driven notebook execution library or direct programmatic execution, based on existing dependencies and reliability.
- How should tests detect required notebook outputs without brittle parsing? — Current thinking: prefer explicit machine-checkable variables, tables, or output markers in notebooks where practical, and add small notebook adjustments if needed.
- What runtime budget should the full notebook suite enforce? — Current thinking: set a bounded but realistic per-notebook or suite-level budget after implementation runtimes are known, with clear failure messages for hangs or excessive runtime.
- Should executed notebooks ever be saved for debugging? — Current thinking: not on successful runs; on failures, temporary executed artifacts may be acceptable if paths are surfaced in pytest output and kept out of committed repository state.
- How strict should value assertions be? — Current thinking: assert presence and basic validity of milestone-critical outputs, such as numeric metrics and positive R/C values, but avoid fragile thresholds for model quality unless a specific slice has already established a stable contract.
