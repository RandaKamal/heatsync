---
estimated_steps: 42
estimated_files: 1
skills_used: []
---

# T01: Created 03_forecasting_lstm.ipynb executing L1 base LSTM forecaster and L2 residual corrector with RMSE/MAPE evaluation and plots

## Why
R003 requires LSTM base prediction (L1) and residual correction using weather/occupancy variables (L2). This is the core deliverable of the slice — the runnable, reader-friendly PyTorch LSTM forecasting notebook.

## Do

1. Create `backend/notebooks/03_forecasting_lstm.ipynb` as a Jupyter notebook.
2. **Imports and setup cell:** Import torch, torch.nn, numpy, pandas, matplotlib, sklearn.metrics.mean_squared_error, and `from notebooks.utils import load_processed`. Set deterministic seed (`torch.manual_seed(42)`, `np.random.seed(42)`). Suppress warnings.
3. **Data loading cell:** Load processed heating data via `load_processed('heating')`. Select first device (pattern from S02). Sort index, set `asfreq('15min')`. Identify target column `status_temperature_in_celsius` and covariate columns: `outside_temperature`, `occupancy_flag`, `hour_of_day`, `day_of_week`, `is_weekend`. Fill NaN with forward-fill then zero.
4. **Sequence preparation cell:** Define `SEQ_LEN = 24` (6 hours of 15-min steps) and `HORIZON = 4` (1 hour ahead). Write a `create_sequences(data, target_idx, seq_len, horizon)` function that builds sliding-window (X, y) pairs from a numpy array. X shape: `(N, seq_len, n_features)`, y shape: `(N,)` — the target value `horizon` steps after the last element of the window.
5. **Train/test split cell:** 80/20 chronological split (matching S02 pattern). Normalize features using training-set mean/std. Convert to `torch.FloatTensor`.
6. **L1 LSTM model definition cell:** Define `class LSTMForecaster(nn.Module)` with `__init__(self, input_dim, hidden_dim=64, num_layers=1)` containing an LSTM layer and a linear output layer. Forward method returns final hidden state through linear layer. Instantiate model, `nn.MSELoss()`, `torch.optim.Adam(lr=1e-3)`.
7. **L1 Training cell:** Train for `EPOCHS = 30` (bounded, fast). Use mini-batch DataLoader with `batch_size=64`. Print epoch loss every 5 epochs. Store training losses for plotting.
8. **L1 Evaluation cell:** Generate predictions on test set. Inverse-transform predictions and actuals back to original scale. Compute and print RMSE and MAPE:
   ```python
   rmse_l1 = np.sqrt(mean_squared_error(y_actual, y_pred_l1))
   mape_l1 = np.mean(np.abs((y_actual - y_pred_l1) / y_actual)) * 100
   print(f'=== L1 Base LSTM Metrics ===')
   print(f'RMSE: {rmse_l1:.4f}')
   print(f'MAPE: {mape_l1:.2f}%')
   ```
9. **L1 Forecast plot cell:** Plot forecast-versus-actual for L1 with clear labels.
10. **L2 Residual correction cell:** Compute residuals `r = y_actual - y_pred_l1`. Build an L2 correction model — a small `nn.Sequential(nn.Linear(n_covariates, 32), nn.ReLU(), nn.Linear(32, 1))` feedforward net that maps weather/occupancy covariates at each test timestep to a residual correction. Use corresponding test-set covariates (`outside_temperature`, `occupancy_flag`, `hour_of_day`) as L2 inputs. Train L2 model for 50 epochs on training-set residuals.
11. **L2 Evaluation cell:** Apply L2 corrections: `y_pred_combined = y_pred_l1 + l2_correction`. Compute and print combined RMSE/MAPE:
    ```python
    rmse_combined = np.sqrt(mean_squared_error(y_actual, y_pred_combined))
    mape_combined = np.mean(np.abs((y_actual - y_pred_combined) / y_actual)) * 100
    print(f'=== L2 Residual-Corrected Metrics ===')
    print(f'RMSE: {rmse_combined:.4f}')
    print(f'MAPE: {mape_combined:.2f}%')
    ```
12. **Comparison cell:** Print a side-by-side comparison table of L1 vs L2 metrics. Honestly note whether L2 improved performance. Optionally note S02 SARIMAX metrics if known.
13. **Combined forecast plot cell:** Plot L1, L2-corrected, and actual on same chart.
14. **Markdown cells throughout:** Add reader-friendly explanations for each section — purpose of LSTM, sequence windowing rationale, two-level architecture concept, and honest interpretation of results.
15. **Cooling window (optional):** If time allows, add a second shorter section repeating the pipeline on cooling data. If skipped, add a markdown note explaining this is straightforward to extend.

## Done-when
- Notebook has sequential cells covering all 14 items above.
- Notebook executes via `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb` with zero exceptions.
- Output cells contain printed L1 RMSE, L1 MAPE, L2 RMSE, L2 MAPE as finite positive numbers.
- At least 2 matplotlib plots rendered (L1 forecast, combined forecast).

## Key interfaces
- `load_processed('heating')` returns DataFrame with columns: `status_temperature_in_celsius`, `outside_temperature`, `occupancy_flag`, `hour_of_day`, `day_of_week`, `is_weekend`, `device_id`.
- Target column: `status_temperature_in_celsius`
- Data is ~2692 rows per window, 15-min intervals, multi-device (select first device).
- PyTorch 2.12.1 is installed with CUDA support.

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/notebooks/02_forecasting_sarimax.ipynb`

## Expected Output

- `backend/notebooks/03_forecasting_lstm.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300 && echo 'Notebook executed successfully'
