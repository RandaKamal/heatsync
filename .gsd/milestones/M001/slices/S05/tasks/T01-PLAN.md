---
estimated_steps: 40
estimated_files: 1
skills_used: []
---

# T01: Created and executed anomaly detection notebook featuring Isolation Forest, One-Class SVM, and PyTorch Autoencoder with Modbus error register cross-referencing.

## Why
R005 requires Isolation Forest, One-Class SVM, and PyTorch Autoencoder to identify sensor faults/alarms. The milestone success criteria require anomaly detection models to flag real sensor anomalies and Modbus alarm registers.

## Do
Create `backend/notebooks/05_anomaly_detection.ipynb` following the established notebook pattern (markdown intro sections, imports, data loading, model building, evaluation). Structure:

**Section 1 — Introduction**: Explain R005 scope, three detector approach, and investigation-candidate framing.

**Section 2 — Data Loading & Feature Selection**: Use `from notebooks.utils import load_processed` to load heating window data. Select a compact anomaly-detection feature set from the 62 available columns:
- Temperature: `status_temperature_in_celsius`, `status_temperature_supply_in_celsius`, `status_temperature_return_in_celsius`, `status_temperature_outside_in_celsius`
- Power/operating: `power_draw_kw`, `status_is_compressor_active`, `status_air_flow_supply_in_percent`
- Pressures: `status_low_pressure_in_bar`, `status_high_pressure_in_bar`
Drop rows with NaN in selected features. Apply `StandardScaler` for normalization.

**Section 3 — Modbus Error Register Parsing**: Parse the `status_error_registers` string column (format: `'0,0,0,0'` or `'0,64,0,0'`). Create a boolean `has_modbus_error` column that is True when any register is non-zero. Note: heating data has 672/2692 rows with `0,64,0,0`; cooling has `0,2,0,0`. These are corroborating context, not ground-truth labels.

**Section 4 — Isolation Forest**: Fit `sklearn.ensemble.IsolationForest` with `contamination=0.05`, `random_state=42`. Predict anomaly labels (-1 = anomaly). Score with `decision_function`. Print count of flagged anomalies and show sample flagged timestamps.

**Section 5 — One-Class SVM**: Fit `sklearn.svm.OneClassSVM` with `kernel='rbf'`, `nu=0.05`. Predict anomaly labels. Score with `decision_function`. Print count of flagged anomalies.

**Section 6 — PyTorch Autoencoder**: Define a simple feedforward Autoencoder (per D002: PyTorch):
- Encoder: input_dim → 32 → 16 (ReLU)
- Decoder: 16 → 32 → input_dim (no activation on output)
- Train with MSE loss, Adam optimizer, 50 epochs, batch_size=64
- Set `torch.manual_seed(42)` for determinism
- Compute per-sample reconstruction error (MSE)
- Flag anomalies where reconstruction error > mean + 2*std
- Print count of flagged anomalies

**Section 7 — Combined Ranking & Shortlist**: For each timestamp, count how many detectors flagged it (0-3 votes). Compute a normalized combined score from each detector's scoring function. Create a ranked anomaly shortlist (top-20 by vote count, then by combined score). Include columns: timestamp, detector_votes, combined_score, has_modbus_error, and key sensor values at that timestamp. Print the shortlist as a DataFrame table.

**Section 8 — Timeline Plot**: Create a matplotlib figure showing:
- Subplot 1: Indoor temperature over time with anomaly markers (colored by detector)
- Subplot 2: Combined anomaly score over time with a threshold line
- Vertical shading or markers where `has_modbus_error` is True
- Title, legend, axis labels

**Section 9 — Interpretation**: Markdown cell discussing detector agreement/disagreement, false-positive risk, what the Modbus error context confirms or doesn't, and honest caveats about anomaly interpretation.

Key implementation notes:
- Use `import warnings; warnings.filterwarnings('ignore')` at top
- Set `np.random.seed(42)` and `torch.manual_seed(42)` for reproducibility
- The notebook must handle the data without modifying utils.py
- Frame all outputs as investigation candidates, not confirmed faults
- Bound autoencoder training to 50 epochs so notebook executes quickly

## Done-when
- Notebook file exists at `backend/notebooks/05_anomaly_detection.ipynb`
- All three detectors produce anomaly flags visible in output cells
- Ranked shortlist table includes Modbus error register cross-reference
- Timeline plot renders with anomaly markers and alarm annotations
- Notebook runs end-to-end in Python without import or runtime errors

## Inputs

- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`
- `backend/data/processed/heating_processed.csv`

## Expected Output

- `backend/notebooks/05_anomaly_detection.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300
