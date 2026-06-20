---
id: S02
milestone: M001
status: ready
---

# S02: Statistical Temperature Forecasting (SARIMAX) — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create a transparent SARIMAX forecasting notebook that uses the S01 15-minute aligned data to forecast near-term primary indoor room temperature and visibly report RMSE and MAPE.

## Why this Slice

This slice follows S01 because SARIMAX needs the normalized 15-minute dataframe, shared feature helpers, and data-quality signals produced by preprocessing. It provides the first statistical forecasting proof in the notebook suite and establishes an honest, interpretable baseline for later LSTM, residual, physical modeling, anomaly, controls, and automated notebook verification work.

## Scope

### In Scope

- Build `02_forecasting_sarimax.ipynb` as a runnable, reader-friendly SARIMAX walkthrough using the shared S01 preprocessing output and helpers.
- Forecast a near-term, next-hours horizon for one clearly documented primary indoor room temperature target on the 15-minute clock.
- Use a small, explainable set of exogenous signals from S01 when available and sufficiently covered, such as ambient/outdoor temperature, heat pump power, or operating state.
- Keep the modeling path transparent: select target, prepare train/test data, fit one SARIMAX workflow with minimal tuning, forecast, and evaluate.
- Show a forecast-versus-actual plot as the main visual proof.
- Present RMSE and MAPE in a compact table or highlighted metric cell near the forecast plot, with a short interpretation sentence.
- Complete successfully even when forecast quality is weak, while making poor fit, instability, or limitations visible in the notebook text and outputs.

### Out of Scope

- LSTM, PyTorch sequence datasets, residual correction, or two-level forecasting; those belong to S03.
- Physical 2R2C or PINN modeling, parameter calibration, or physics-informed loss terms; those belong to S04.
- Anomaly scoring or treating forecast residuals as anomaly detections; those belong to S05.
- Energy control decisions, comfort setpoints, or savings calculations; those belong to S06.
- Full notebook-suite execution tests; those belong to S07.
- Broad feature search, extensive hyperparameter optimization, or tuning until the forecast looks strong.
- Multi-target temperature forecasting across several sensors or zones unless a future slice explicitly expands the scope.

## Constraints

- S02 depends on S01 and should consume S01’s conservative 15-minute aligned dataframe, shared utilities, and data-quality indicators rather than reimplementing preprocessing.
- Shared helper imports should come from `backend/notebooks/utils.py` per decision D001.
- The notebook must run end-to-end programmatically with zero exceptions as part of the milestone’s notebook-suite goal.
- RMSE and MAPE must be generated and visible in notebook output to satisfy the milestone forecasting success criterion.
- The forecast should prioritize interpretability and honest evidence over cosmetic performance.
- Required data missing from the S01 output should fail clearly or degrade with explicit notebook explanation, not silently produce misleading metrics.
- Optional exogenous variables should only be used when their coverage and meaning are clear enough to explain to a reader.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared functions for loading or rebuilding the S01 aligned dataframe and accessing generic features or data-quality indicators.
- `backend/notebooks/01_preprocessing.ipynb` — Predecessor notebook that demonstrates the preprocessing assumptions and normalized data shape S02 relies on.
- `backend/data/processed/` or the repository’s selected S01 processed-data artifact location — Deterministic 15-minute aligned dataframe used as SARIMAX input when available.
- `backend/data/` — Raw HeatSync data only indirectly, through S01 utilities or regenerated preprocessing outputs when needed.

### Produces

- `backend/notebooks/02_forecasting_sarimax.ipynb` — Runnable SARIMAX notebook showing target selection, explainable inputs, forecast plot, RMSE, MAPE, and honest limitations.
- Notebook output cells containing RMSE and MAPE — Human-readable and automation-friendly evidence for milestone and S07 verification.
- Forecast-versus-actual chart — Visual proof of near-term primary indoor temperature forecasting behavior.

## Open Questions

- What exact near-term forecast horizon should be used? — Current thinking: choose a practical few-hours horizon on the 15-minute clock during implementation, balancing operational relevance with enough test data for metrics.
- Which exact column is the primary indoor room temperature target? — Current thinking: select the clearest indoor temperature column from S01 outputs based on naming, coverage, and documentation, then state the choice in the notebook.
- Which exogenous variables should be included? — Current thinking: include only a few explainable, sufficiently covered S01 features; fall back to a target-history-only SARIMAX if optional drivers are missing or too sparse.
- Should a naive baseline be included? — Current thinking: not required for the core slice, but acceptable as a lightweight sanity check if it helps explain weak SARIMAX performance without expanding into a model-comparison slice.
