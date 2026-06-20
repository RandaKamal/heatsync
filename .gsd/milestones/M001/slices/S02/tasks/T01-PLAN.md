---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Built the SARIMAX temperature forecasting notebook and added unit tests for model training and forecasting.

## Inputs

- None specified.

## Expected Output

- `backend/notebooks/02_forecasting_sarimax.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=600 backend/notebooks/02_forecasting_sarimax.ipynb && echo 'Notebook executed successfully'
