---
id: S05
milestone: M001-992333
status: ready
---

# S05: Anomaly Detection Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver `backend/notebooks/05_anomaly_detection.ipynb` with unsupervised ML anomaly detection (Isolation Forest, One-Class SVM, PyTorch Autoencoder) on sensor data and full Modbus alarm register bitfield decoding, on both heating and cooling windows.

## Why this Slice

S05 addresses the milestone acceptance criterion that "anomaly detection models successfully flag real sensor anomalies and alarm registers present in the dataset." It depends only on S01's preprocessed data and has no downstream dependencies other than S07 (integration test). The real dataset contains active Modbus alarms (~25% of raw snapshot rows have non-zero registers) with different fault patterns per season — heating shows Circuit 1 Low Pressure Alarm (register 1902 bit 6), cooling shows Heat Recovery System Fault (register 1902 bit 1) — making this a meaningful detection exercise.

## Scope

### In Scope

- `backend/notebooks/05_anomaly_detection.ipynb` in two distinct parts:

**Part 1: ML-Based Sensor Anomaly Detection**
- Input features (5 columns): `temperature_in`, `temperature_outside`, `humidity`, `co2_ppm`, `power_draw_kw`.
- Feature scaling (StandardScaler or MinMaxScaler) before feeding models.
- Three unsupervised models:
  1. **Isolation Forest** — `sklearn.ensemble.IsolationForest(contamination=0.05, random_state=42)`.
  2. **One-Class SVM** — `sklearn.svm.OneClassSVM(nu=0.05)`.
  3. **PyTorch Autoencoder** — Simple feedforward architecture: 5→3→5 (bottleneck=3), ReLU activation, MSE reconstruction loss. 50 epochs, `torch.manual_seed(42)`. Anomaly threshold = `mean + 2*std` of reconstruction error on training data.
- NaN/Inf guard on Autoencoder training (same pattern as S03).
- Both heating and cooling windows analyzed independently — two sets of results.
- Output per window:
  - Model comparison table: anomaly count and percentage per model.
  - Timeline overlay plot: temperature line with anomaly flags from all three models (colored dots).
  - Top anomaly timestamps (sorted by consensus — flagged by 2+ models).

**Part 2: Modbus Alarm Register Analysis**
- Read raw `status_error_registers` column directly from `heat_pump_snapshots.csv` (not from S01's preprocessed data).
- Full bitfield decode of all 4 registers (1901–1904) into human-readable alarm names using the mapping from `backend/data/README.md`.
- Per-device alarm decoding (4 devices).
- Alarm frequency table: which alarms fire and how often.
- Alarm timeline plot showing when alarms are active across the time window.
- Both heating and cooling windows decoded.

**Notebook feel:**
- Educational markdown cells explaining each model's approach.
- Inline matplotlib plots only — no saved image files.
- Consistent style with S02–S04 notebooks.

### Out of Scope

- Supervised anomaly detection or labeled training data.
- Cross-correlation analysis between ML-flagged anomalies and Modbus alarms (reader can visually compare timelines).
- Per-model diagnostic plots (score histograms, decision boundaries, reconstruction error distributions).
- VAE or deep autoencoder architectures.
- Comparing contamination parameter values (hardcoded 0.05).
- Adding alarm decode helpers to `utils.py` — decode logic lives in the notebook.
- Anomaly severity scoring or prioritization beyond the binary flag.
- GPU/CUDA-specific code — CPU-only sufficient.

## Constraints

- Must import preprocessed sensor data via `utils.py` (`load_and_preprocess('heating')` / `load_and_preprocess('cooling')`) for Part 1.
- Must read raw snapshot CSVs directly for Modbus registers in Part 2 (the `status_error_registers` column was intentionally excluded from S01's curated preprocessed output; only a boolean `has_alarm` survives preprocessing).
- S01 data contract columns for Part 1: `timestamp` (index), `temperature_in`, `temperature_outside`, `humidity`, `co2_ppm`, `power_draw_kw` (plus others not used by anomaly detection).
- scikit-learn and PyTorch already in `backend/pyproject.toml` from S01/T01. No new dependencies.
- Python ≥ 3.13.
- `random_state=42` for sklearn models, `torch.manual_seed(42)` for Autoencoder — deterministic for S07 integration test.
- Must pass `ruff check` and `mypy` linting.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — `load_and_preprocess(window)` for preprocessed sensor features (Part 1).
- `backend/data/heating_2026-03-30_to_2026-04-05/heat_pump_snapshots.csv` — raw error registers column (Part 2).
- `backend/data/cooling_2026-05-25_to_2026-05-31/heat_pump_snapshots.csv` — raw error registers column (Part 2).
- `backend/data/README.md` — Modbus register bit-to-alarm-name mapping (referenced in notebook markdown; hardcoded in decode logic).

### Produces

- `backend/notebooks/05_anomaly_detection.ipynb` — self-contained notebook that, when executed:
  1. Prints per-model anomaly count tables for both windows.
  2. Shows timeline overlay plots of ML-detected anomalies on temperature data.
  3. Prints decoded Modbus alarm frequency tables.
  4. Shows alarm timeline plots for both windows.

## Open Questions

- **Feature scaling choice** — StandardScaler vs MinMaxScaler before feeding the unsupervised models. Current thinking: StandardScaler (zero mean, unit variance) since Isolation Forest and One-Class SVM are distance-based. Decide during implementation.
- **Autoencoder train/test split** — Whether to train on all data (unsupervised, no labels) or split temporally like S02/S03. Current thinking: train on all data since this is unsupervised anomaly detection — the model learns "normal" from the bulk distribution and flags outliers. No holdout needed.
- **Per-device vs aggregated Modbus decode** — S01 aggregates devices by mean. The raw snapshots have per-device registers. Current thinking: decode per-device to show which specific heat pump unit has faults, then summarize at the space level.

## Key Behavioural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Notebook structure | Two-part: ML anomaly detection + Modbus alarm decode | Milestone requires both sensor anomalies and alarm registers flagged |
| Anomaly features | 5 sensor columns (temp_in, temp_out, humidity, co2, power_draw) | Core sensor signals; excludes categorical/time features |
| Contamination | 0.05 (5%) for IF and SVM | Conservative estimate; real alarm rate is higher but 15-min aggregation reduces it |
| Autoencoder | Simple 5→3→5, 50 epochs, MSE, threshold = mean + 2*std | Minimal architecture sufficient for 5-dim sensor data |
| Modbus data source | Raw snapshot CSV read directly | S01 only passes boolean has_alarm; full bitfield decode needs the raw register string |
| Detection windows | Both heating and cooling independently | Different fault patterns per season; shows real-world value |
| Output format | Summary table + timeline overlay + top timestamps | Concise, visual, actionable |
