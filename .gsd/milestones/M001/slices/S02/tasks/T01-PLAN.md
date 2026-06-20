---
estimated_steps: 29
estimated_files: 1
skills_used: []
---

# T01: Build SARIMAX forecasting notebook

## Why
R002 requires ARIMA/SARIMAX models to forecast indoor room temperatures. This task creates the core notebook artifact.

## Do
1. Create `backend/notebooks/02_forecasting_sarimax.ipynb` as a reader-friendly, runnable SARIMAX walkthrough.
2. **Data loading:** Import from `backend.notebooks.utils` using `load_processed('heating')`. Document the target column choice (`status_temperature_in_celsius` — indoor room temperature, 100% coverage, 2692 rows at 15-min intervals over ~7 days).
3. **Train/test split:** Use a temporal split — first ~5.5 days for training, last ~1.5 days for testing (roughly 80/20). Document the split timestamps.
4. **Exogenous variables:** Use `outside_temperature` (outdoor temp, 100% coverage) as the primary exogenous signal. If fitting fails with exog, fall back gracefully to univariate SARIMA and document why.
5. **SARIMAX model:** Use `statsmodels.tsa.statespace.sarimax.SARIMAX`. Use a practical order — start with `order=(1,1,1)` and `seasonal_order=(1,1,1,96)` for 96 steps/day (15-min intervals). If seasonal_order=(1,1,1,96) is too expensive or fails to converge, reduce to `seasonal_order=(1,0,1,96)` or `(0,0,0,0)` and document the decision.
6. **Forecasting:** Generate out-of-sample forecasts over the test period. Use `get_forecast(steps=len(test))` with exogenous test data.
7. **Metrics:** Compute RMSE (`np.sqrt(mean_squared_error(actual, predicted))`) and MAPE (`np.mean(np.abs((actual - predicted) / actual)) * 100`). Print both in a clearly labeled cell.
8. **Visualization:** Create a forecast-vs-actual matplotlib plot with labeled axes, legend, and title. Optionally show a second plot for the heating window or try cooling window too.
9. **Honest limitations:** Add a markdown cell at the end documenting model limitations, convergence warnings, and any caveats.
10. **Notebook structure:** Use clear markdown section headers: Introduction, Data Loading, Exploratory Analysis (brief), Train/Test Split, SARIMAX Fitting, Forecast & Evaluation, Visualization, Limitations.

## Done-when
- `backend/notebooks/02_forecasting_sarimax.ipynb` exists with all sections.
- Notebook runs end-to-end via `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/02_forecasting_sarimax.ipynb` with zero exceptions.
- Output cells contain numeric RMSE and MAPE values.
- A forecast-vs-actual chart is rendered.

## Key References
- `backend/notebooks/utils.py` — `load_processed(window)` returns a DataFrame with timestamp index and 62 columns. Key columns: `status_temperature_in_celsius` (target), `outside_temperature` (exog).
- `backend/data/processed/processed_heating.csv` — 2692 rows, 15-min intervals, 2026-03-30 to 2026-04-06.
- `backend/data/processed/processed_cooling.csv` — 2692 rows, 15-min intervals, 2026-05-25 to 2026-06-01.
- `statsmodels>=0.14.6` is already in backend/pyproject.toml dependencies.
- S01 notebook `01_preprocessing.ipynb` for pattern reference (cell structure, imports).

## Assumptions
- `status_temperature_in_celsius` is the primary indoor room temperature target (best named, 100% coverage).
- A few-hours forecast horizon (e.g., 1.5 days test set) is practical for SARIMAX evaluation.
- `seasonal_order` with period=96 may be computationally expensive; the task allows graceful fallback to simpler seasonal orders or pure ARIMA if needed.
- statsmodels convergence warnings are acceptable as long as the model produces numeric forecasts.

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/processed_cooling.csv`
- `backend/notebooks/01_preprocessing.ipynb`

## Expected Output

- `backend/notebooks/02_forecasting_sarimax.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && echo 'Notebook executed successfully'
