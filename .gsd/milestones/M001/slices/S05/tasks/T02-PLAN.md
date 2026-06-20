---
estimated_steps: 44
estimated_files: 1
skills_used: []
---

# T02: Implemented unit tests for anomaly detection models and end-to-end notebook verification

## Why
The milestone requires all notebooks to run end-to-end with zero exceptions. R005 validation needs test evidence that Isolation Forest, One-Class SVM, and Autoencoder each produce meaningful anomaly flags. Prior slices (S02, S03, S04) each have dedicated test files.

## Do
Create `backend/tests/test_anomaly.py` following the established test pattern from `test_lstm.py` and `test_physical.py`:

**1. Test Isolation Forest detector:**
- Load processed heating data via `from notebooks.utils import load_processed`
- Select the same feature set used in the notebook (temperature, power, pressure columns)
- Fit `IsolationForest(contamination=0.05, random_state=42)` on scaled data
- Assert predictions contain both -1 (anomaly) and 1 (normal) labels
- Assert anomaly count is > 0 and < total sample count
- Assert `decision_function` returns finite float scores

**2. Test One-Class SVM detector:**
- Fit `OneClassSVM(kernel='rbf', nu=0.05)` on scaled data
- Assert predictions contain both -1 and 1 labels
- Assert anomaly count is > 0 and < total sample count
- Assert `decision_function` returns finite float scores

**3. Test PyTorch Autoencoder detector:**
- Define the same Autoencoder architecture (input_dim → 32 → 16 → 32 → input_dim)
- Train for 50 epochs with MSE loss, Adam optimizer, batch_size=64, torch.manual_seed(42)
- Compute per-sample reconstruction error
- Assert reconstruction errors are all finite and non-negative
- Assert threshold-based anomaly count (mean + 2*std) is > 0
- Assert the model's output dimension matches input dimension

**4. Test Modbus error register parsing:**
- Assert that parsing `'0,64,0,0'` produces has_modbus_error=True
- Assert that parsing `'0,0,0,0'` produces has_modbus_error=False
- Assert error register column exists in processed data

**5. Test combined ranking:**
- Given mock detector outputs, verify vote counting produces correct [0-3] range
- Verify ranking sorts by votes descending, then by score descending

**6. End-to-end notebook execution test:**
- Execute `05_anomaly_detection.ipynb` via nbconvert programmatically (same pattern as test_physical.py)
- Assert no CellExecutionError
- Assert notebook has output cells (not empty)

Key test implementation notes:
- Import pattern: `from notebooks.utils import load_processed`
- Use `sys.path` append for backend directory as in test_physical.py
- Feature columns: `['status_temperature_in_celsius', 'status_temperature_supply_in_celsius', 'status_temperature_return_in_celsius', 'status_temperature_outside_in_celsius', 'power_draw_kw', 'status_is_compressor_active', 'status_air_flow_supply_in_percent', 'status_low_pressure_in_bar', 'status_high_pressure_in_bar']`
- Use `StandardScaler` for feature normalization
- Ensure all tests pass with `uv run --project backend pytest backend/tests/test_anomaly.py -v`

## Done-when
- `backend/tests/test_anomaly.py` exists with tests for all three detectors, Modbus parsing, combined ranking, and notebook execution
- All tests pass: `uv run --project backend pytest backend/tests/test_anomaly.py -v`
- Ruff and mypy pass on the test file

## Inputs

- `backend/notebooks/05_anomaly_detection.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/tests/test_physical.py`
- `backend/tests/test_lstm.py`

## Expected Output

- `backend/tests/test_anomaly.py`

## Verification

uv run --project backend pytest backend/tests/test_anomaly.py -v && uv run --project backend ruff check backend/tests/test_anomaly.py && uv run --project backend mypy backend/tests/test_anomaly.py --ignore-missing-imports
