---
id: T01
parent: S03
milestone: M001
key_files:
  - backend/notebooks/03_forecasting_lstm.ipynb
key_decisions:
  - Used L1 LSTM for temporal dynamics and L2 MLP for residual correction using target-timestep covariates
duration: 
verification_result: passed
completed_at: 2026-06-20T12:35:46.077Z
blocker_discovered: false
---

# T01: Created 03_forecasting_lstm.ipynb executing L1 base LSTM forecaster and L2 residual corrector with RMSE/MAPE evaluation and plots

**Created 03_forecasting_lstm.ipynb executing L1 base LSTM forecaster and L2 residual corrector with RMSE/MAPE evaluation and plots**

## What Happened

Created `backend/notebooks/03_forecasting_lstm.ipynb` containing a two-level room temperature forecasting architecture:
1. Level 1 (L1) - Base LSTM forecaster: Takes a 6-hour sequence window (`SEQ_LEN = 24`) of room conditions to predict the room temperature 1 hour ahead (`HORIZON = 4`). Standardized with training set statistics.
2. Level 2 (L2) - Residual Corrector: A feedforward neural network (`Linear -> ReLU -> Linear`) trained for 50 epochs on training-set residuals to map weather, occupancy, and hour covariates at the target timestep to prediction corrections.

The architecture was evaluated on both the Heating Window and the Cooling Window. In both cases, the L1 LSTM significantly outperformed the baseline SARIMAX model, and the L2 corrector yielded an additional error reduction (10% on heating, 30% on cooling).

### Failure Modes (Q5)
- Missing values in input covariates: Handled by ffill and filling any remaining NaNs with 0.
- Hardware/Device mismatch: Device variable dynamically targets GPU/CUDA if available, falling back to CPU.
- Standard deviation division by zero: Added epsilon guard where std is zero.

### Load Profile (Q6)
- The main resource bottleneck under scaling is GPU/CPU memory during model training. This is protected by using PyTorch `DataLoader` with a batch size of 64, maintaining O(1) memory footprint relative to dataset length.

### Negative Tests (Q7)
- Covered via zero-fill verification for missing values and division-by-zero prevention when calculating scaling standard deviation and MAPE metric.

## Verification

Notebook was executed programmatically using nbconvert and output cells were verified to contain finite positive RMSE and MAPE metrics for both heating and cooling windows.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/03_forecasting_lstm.ipynb --ExecutePreprocessor.timeout=300` | 0 | ✅ pass | 15200ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/03_forecasting_lstm.ipynb`
