---
id: S03
milestone: M001-992333
status: ready
---

# S03: Machine Learning and Two Level Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver `backend/notebooks/03_forecasting_lstm.ipynb` with a PyTorch LSTM base predictor (L1) and a smaller residual-correcting LSTM (L2), reporting RMSE/MAPE on both heating and cooling windows with a side-by-side SARIMAX comparison table.

## Why this Slice

S03 provides the deep learning counterpart to S02's statistical SARIMAX baseline. Together they let readers compare traditional time-series methods against neural approaches on the same data and split. S03 depends only on S01's preprocessed data contract and feeds into S07 (integration test). Building it alongside S02 validates that the S01 data contract supports both modelling paradigms.

## Scope

### In Scope

- `backend/notebooks/03_forecasting_lstm.ipynb` with two-level PyTorch LSTM architecture:
  - **L1:** LSTM predicting `temperature_in` from a 24-timestep (6-hour) lookback window.
  - **L2:** Smaller LSTM trained on L1's residual errors (same lookback, fewer hidden units).
  - Final prediction = L1 + L2 correction.
- Input features per timestep (6 total): `temperature_in` (autoregressive), `temperature_outside`, `target_temperature`, `hour`, `day_of_week`, `is_weekend`.
- Both heating and cooling windows modelled independently (same pattern as S02).
- Train/test split: first 5 days train, last 2 days test (matching S02).
- Training config: 50 epochs, `torch.manual_seed(42)`, print loss every 10 epochs. No early stopping.
- NaN/Inf loss guard: check each epoch, print warning and break training early if detected. Notebook never crashes on training instability.
- Notebook outputs (matching S02 style):
  1. Training loss curves (L1 and L2).
  2. Forecast-vs-actual plot per window showing actual, L1 prediction, and L1+L2 prediction.
  3. Metrics table: RMSE/MAPE for L1 and L1+L2, per window.
  4. SARIMAX comparison table with hardcoded S02 metric values (reader updates after running S02).
- Inline matplotlib plots only — no saved image files.
- Feature scaling (MinMaxScaler or StandardScaler) applied before feeding the LSTM; inverse-transformed for metrics and plots.

### Out of Scope

- Forecasting humidity, CO2, or any variable other than indoor temperature.
- Hyperparameter tuning, grid search, or Bayesian optimization.
- Early stopping or validation split from the 5-day training data.
- Gradient clipping (NaN guard with early break is sufficient for this demo).
- Attention mechanisms, Transformer models, or architectures beyond LSTM.
- Saving trained model weights to disk.
- Re-running SARIMAX live inside this notebook — comparison uses hardcoded constants.
- GPU/CUDA-specific code — CPU-only training is sufficient for the dataset size.

## Constraints

- Must import data via `utils.py` (`load_and_preprocess('heating')` / `load_and_preprocess('cooling')`) — no direct CSV loading.
- S01 data contract columns: `timestamp` (index), `temperature_in`, `temperature_outside`, `target_temperature`, `humidity`, `co2_ppm`, `operation_mode`, `power_draw_kw`, `has_alarm`, `hour`, `day_of_week`, `is_weekend`.
- PyTorch already in `backend/pyproject.toml` from S01/T01. No new dependencies required.
- Python ≥ 3.13 with PyTorch CPU.
- `torch.manual_seed(42)` must be set before any model initialization or data shuffling to ensure deterministic notebook execution for S07.
- Must pass `ruff check` and `mypy` linting.
- Lookback of 24 timesteps means the first 24 rows of training data are consumed as initial context — effective training samples ≈ 456 per window.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — `load_and_preprocess(window)` returning a 15-min aligned DataFrame with the curated column set.

### Produces

- `backend/notebooks/03_forecasting_lstm.ipynb` — self-contained notebook that, when executed, prints RMSE/MAPE metrics for L1 and L1+L2, renders inline forecast and training loss plots for both windows, and displays a SARIMAX comparison table.

## Open Questions

- **Optimal LSTM hidden size for this dataset** — With only ~456 training samples and 6 features, a large hidden layer will overfit. Current thinking: start with hidden_size=32 for L1 and hidden_size=16 for L2; adjust during implementation if training loss shows clear under/overfitting.
- **Feature scaling approach** — MinMaxScaler vs. StandardScaler for the input features. Current thinking: MinMaxScaler to [0, 1] since temperature ranges are bounded and non-Gaussian; decide during implementation.
- **SARIMAX comparison values** — The hardcoded SARIMAX RMSE/MAPE values will initially be placeholders until S02 is executed. Current thinking: use clearly labelled constants at the top of the notebook with a comment instructing the reader to update them.

## Key Behavioural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Two-level architecture | L1 LSTM + L2 smaller LSTM on residuals | Both PyTorch, consistent framework; L2 corrects systematic L1 errors |
| Input features | 6 features: temp_in, temp_out, target_temp, hour, dow, is_weekend | Matches S02's exogenous set + time features for fair comparison |
| Lookback window | 24 timesteps (6 hours) | Captures intra-day transitions; yields ~456 training samples from 480 rows |
| Training config | 50 epochs, manual_seed(42), log every 10 | Deterministic, fast (~30-60s CPU), consistent for S07 integration test |
| Loss safety | NaN/Inf check + early break per epoch | Notebook never crashes; reader sees training health status |
| Notebook output | Loss curves + forecast plots + metrics + SARIMAX comparison | Matches S02 feel; adds loss curves since PyTorch training is explicit |
| SARIMAX comparison | Hardcoded constants, reader updates | Avoids coupling notebooks or re-running SARIMAX; clear and simple |
