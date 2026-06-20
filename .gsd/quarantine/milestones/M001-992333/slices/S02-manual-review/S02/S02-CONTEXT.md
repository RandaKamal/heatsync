---
id: S02
milestone: M001-992333
status: ready
---

# S02: Statistical Temperature Forecasting — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver `backend/notebooks/02_forecasting_sarimax.ipynb` that fits SARIMAX models on both heating and cooling windows, reports RMSE/MAPE, and shows forecast-vs-actual plots with residual analysis.

## Why this Slice

S02 is the first forecasting model and establishes the baseline statistical approach that S03 (LSTM) will be compared against. It depends only on S01's preprocessed data contract and has no downstream blockers other than S07 (integration test). Building it early validates that the S01 data contract is sufficient for time-series modeling.

## Scope

### In Scope

- `backend/notebooks/02_forecasting_sarimax.ipynb` with two independent SARIMAX models (one per time window: heating and cooling).
- Target variable: `temperature_in` only.
- Exogenous variables: `temperature_outside` and `target_temperature`.
- Hardcoded SARIMAX order `(1,1,1)(1,1,1,96)` with a markdown cell explaining the choice. No auto-search, no pmdarima dependency.
- Train/test split: first 5 days train, last 2 days test per window. Strict temporal order, no shuffling.
- Seasonal period s=96 (15-min × 96 = 24-hour daily cycle), accepting slower fit times.
- Convergence handling: catch `ConvergenceWarning`, log it in a markdown-friendly print, and proceed with partial results. The notebook never raises on convergence issues.
- Notebook outputs per window: forecast-vs-actual plot with confidence interval shading, printed RMSE/MAPE metrics table, residual time-series plot, and residual ACF plot.
- Inline matplotlib plots only — no saved image files.

### Out of Scope

- Forecasting humidity, CO2, or any variable other than indoor temperature.
- Automated order selection via pmdarima or grid search.
- Resampling to hourly resolution — SARIMAX operates on the native 15-min grid.
- Multi-step rolling cross-validation — a single temporal split per window.
- Comparison with LSTM or other models (that's S03's responsibility).
- Saving forecast results to disk for downstream consumption.

## Constraints

- Must import data via `utils.py` (`load_and_preprocess('heating')` / `load_and_preprocess('cooling')`) — no direct CSV loading.
- S01 data contract columns: `timestamp` (index), `temperature_in`, `temperature_outside`, `target_temperature`, `humidity`, `co2_ppm`, `operation_mode`, `power_draw_kw`, `has_alarm`, `hour`, `day_of_week`, `is_weekend`.
- SARIMAX fit with s=96 may take 1–5 minutes per window. Notebook total execution time may be 2–10 minutes. S07 integration test must tolerate this.
- Python ≥ 3.13 with `statsmodels` (already in `backend/pyproject.toml` from T01).
- Must pass `ruff check` and `mypy` linting.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — `load_and_preprocess(window)` returning a 15-min aligned DataFrame with the curated column set.

### Produces

- `backend/notebooks/02_forecasting_sarimax.ipynb` — self-contained notebook that, when executed, prints RMSE/MAPE metrics and renders inline forecast and diagnostic plots for both heating and cooling windows.

## Open Questions

- **Optimal SARIMAX order for this specific dataset** — The hardcoded `(1,1,1)(1,1,1,96)` is a reasonable default but may not be optimal. Current thinking: accept the default for this demonstration notebook; a reader can experiment with alternative orders. Not worth adding pmdarima complexity.
- **Seasonal differencing data loss** — Seasonal differencing with s=96 removes the first day of data from 7 days, leaving 6 effective days. Current thinking: acceptable; 5-day train / 2-day test split still works because differencing is applied internally by statsmodels during fitting.

## Key Behavioural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Forecast windows | Both heating and cooling independently | Shows model performance across seasons; only 7 days each so keep separate |
| Target variable | `temperature_in` only | Primary HVAC control variable; humidity forecasting is not the use case |
| Exogenous inputs | `temperature_outside`, `target_temperature` | Two strongest physical drivers; more features risk overfitting on ~480 training rows |
| Train/test split | 5 days train / 2 days test | ~71/29 split balances training data with meaningful test evaluation |
| Order selection | Hardcoded `(1,1,1)(1,1,1,96)` | Deterministic, fast, no extra dependency; educational notebook explains the choice |
| Seasonal period | s=96 (15-min native resolution) | Correct daily cycle; accept slower fit rather than lose temporal resolution |
| Convergence failure | Warn and continue with partial results | Notebook must never crash; reader sees convergence status clearly |
| Output style | Forecast plot + metrics table + residual analysis | Educational and concise; not a full diagnostic suite |
