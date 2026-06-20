---
id: S03
milestone: M001
status: ready
---

# S03: LSTM and Two-Level Forecasting Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create a fast, deterministic PyTorch LSTM forecasting notebook that uses the S01 15-minute aligned data to forecast near-term primary indoor room temperature, report RMSE/MAPE, and demonstrate a simple residual correction layer.

## Why this Slice

This slice follows S01 because LSTM sequence modeling depends on the normalized 15-minute dataframe, shared feature helpers, and data-quality signals produced by preprocessing. It complements S02 by showing a learned sequence-model approach to the same practical near-term indoor-temperature forecasting story, while giving later notebook-suite verification a second forecasting model with visible metrics.

## Scope

### In Scope

- Build `03_forecasting_lstm.ipynb` as a runnable, reader-friendly PyTorch notebook using S01 aligned data and shared utilities.
- Forecast near-term primary indoor room temperature on the 15-minute clock, keeping the story comparable to S02 where practical.
- Prepare sliding-window sequence inputs from the primary indoor temperature and the same small, explainable core covariates used by S02 when available.
- Train a bounded, deterministic base LSTM with a fixed random seed, modest model size, epoch cap, and visible training/validation loss.
- Add a simple L2 residual correction layer after the base LSTM when it can be explained clearly and evaluated without overbuilding the notebook.
- Present base LSTM and residual-corrected forecast results with forecast-versus-actual plots and compact RMSE/MAPE metrics.
- Show before/after RMSE and MAPE for the residual layer and state honestly when residual correction does not improve performance.
- Optionally reference the S02 SARIMAX baseline in a light side-by-side note or table if those metrics are easy to consume without creating tight notebook coupling.

### Out of Scope

- Reimplementing S01 preprocessing, timestamp alignment, or data-quality handling inside the LSTM notebook.
- Broad feature searches, extensive hyperparameter sweeps, long training runs, or tuning until the LSTM beats SARIMAX.
- Turning S03 into a full model competition across SARIMAX, LSTM, residual models, and additional algorithms.
- Physical 2R2C or PINN modeling, parameter calibration, or physics-informed losses; those belong to S04.
- Treating forecast residuals as anomaly detections or producing anomaly timestamps; that belongs to S05.
- Occupancy controls, comfort setpoints, or energy savings calculations; those belong to S06.
- Persisting trained model weights, building a model registry, deployment packaging, or production ML pipelines.
- Full notebook-suite execution tests; those belong to S07.

## Constraints

- S03 depends on S01 and should consume the shared 15-minute aligned dataframe and helpers rather than duplicating preprocessing logic.
- PyTorch is the selected deep learning framework for LSTM, PINN, and Autoencoder work per decision D002.
- Shared helper imports should come from `backend/notebooks/utils.py` per decision D001.
- The notebook must run end-to-end programmatically with zero exceptions as part of the milestone’s notebook-suite goal.
- RMSE and MAPE must be generated and visible in notebook output to satisfy the milestone forecasting success criterion.
- Training should be fast, deterministic, and bounded so automated execution remains reliable.
- Weak or noisy training results should be reported honestly rather than hidden by excessive tuning or cosmetic output.
- Optional covariates should only be used when their S01 coverage and meaning are clear enough to explain; otherwise the notebook should fall back to a simpler input set.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared loading, aligned-data access, generic feature, and metric helpers used to prepare LSTM inputs without redoing preprocessing.
- `backend/notebooks/01_preprocessing.ipynb` — Predecessor notebook documenting the normalized 15-minute data foundation and quality assumptions.
- `backend/notebooks/02_forecasting_sarimax.ipynb` — Prior forecasting notebook used only as an optional light baseline reference if its metrics are readily available.
- `backend/data/processed/` or the repository’s selected S01 processed-data artifact location — Deterministic 15-minute aligned dataframe used to build LSTM sequences.

### Produces

- `backend/notebooks/03_forecasting_lstm.ipynb` — Runnable PyTorch LSTM notebook showing sequence preparation, base LSTM training, residual correction, forecast plots, RMSE, MAPE, and honest limitations.
- Notebook output cells containing base LSTM RMSE and MAPE — Human-readable and automation-friendly evidence for milestone and S07 verification.
- Notebook output cells containing residual-corrected RMSE and MAPE when the residual layer runs — Evidence for the two-level forecasting portion of the slice.
- Forecast-versus-actual charts for base LSTM and, when applicable, residual-corrected predictions — Visual proof of near-term indoor-temperature forecasting behavior.

## Open Questions

- What exact sequence length and forecast horizon should be used? — Current thinking: align with S02’s near-term few-hours forecasting horizon where practical, with a compact history window that keeps training fast.
- Which exact column is the primary indoor room temperature target? — Current thinking: reuse the S02 target selection once S02/S01 implementation establishes the canonical indoor temperature column.
- Which covariates should be included in the LSTM input window? — Current thinking: reuse the small explainable S02-style feature set when coverage is sufficient, and otherwise fall back to target history plus clearly available core signals.
- What exact residual correction implementation should be used? — Current thinking: choose a simple, bounded, explainable residual model during execution; it should demonstrate the two-level idea without requiring improvement for the notebook to be considered successful.
- Should SARIMAX metrics be imported into S03? — Current thinking: optional only; include them if they are easy to access, but do not create brittle cross-notebook dependency just to compare models.
