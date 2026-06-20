# S05: Anomaly Detection Models

**Goal:** Create 05_anomaly_detection.ipynb that runs Isolation Forest, One-Class SVM, and PyTorch Autoencoder on S01's 15-minute aligned data, flags anomalous timestamps with a ranked shortlist, cross-references Modbus error registers, and produces timeline plots — all executing end-to-end with zero exceptions.
**Demo:** Runs 05_anomaly_detection.ipynb listing flagged anomaly timestamps from Isolation Forest, One-Class SVM, and Autoencoder.

## Must-Haves

- 05_anomaly_detection.ipynb runs end-to-end programmatically via nbconvert with zero exceptions
- Isolation Forest, One-Class SVM, and Autoencoder each produce visible anomaly flags in notebook output
- Ranked anomaly shortlist table combines detector votes/scores with Modbus error register context
- Timeline plot marks suspicious periods, detector flags, and alarm annotations
- Unit tests in backend/tests/test_anomaly.py pass covering all three detector models
- R005 is advanced: anomaly detection models flag real sensor anomalies with Modbus alarm context

## Proof Level

- This slice proves: Unit tests on detector models (test_anomaly.py) + programmatic notebook execution via nbconvert.

## Integration Closure

S05 consumes backend/notebooks/utils.py (load_processed) and backend/data/processed/ artifacts from S01. S05 produces backend/notebooks/05_anomaly_detection.ipynb consumed by S07 for notebook-suite verification. No utils.py modifications required.

## Verification

- Notebook output cells show detector-specific anomaly counts, ranked shortlist table, and timeline plot. No runtime observability surfaces beyond notebook output.

## Tasks

- [x] **T01: Created and executed anomaly detection notebook featuring Isolation Forest, One-Class SVM, and PyTorch Autoencoder with Modbus error register cross-referencing.** `est:Large (single notebook, three models, plots, cross-referencing)`
  ## Why
  R005 requires Isolation Forest, One-Class SVM, and PyTorch Autoencoder to identify sensor faults/alarms. The milestone success criteria require anomaly detection models to flag real sensor anomalies and Modbus alarm registers.
  - Files: `backend/notebooks/05_anomaly_detection.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300

- [x] **T02: Implemented unit tests for anomaly detection models and end-to-end notebook verification** `est:Medium (test file with 6 test functions, established pattern)`
  ## Why
  The milestone requires all notebooks to run end-to-end with zero exceptions. R005 validation needs test evidence that Isolation Forest, One-Class SVM, and Autoencoder each produce meaningful anomaly flags. Prior slices (S02, S03, S04) each have dedicated test files.
  - Files: `backend/tests/test_anomaly.py`
  - Verify: uv run --project backend pytest backend/tests/test_anomaly.py -v && uv run --project backend ruff check backend/tests/test_anomaly.py && uv run --project backend mypy backend/tests/test_anomaly.py --ignore-missing-imports

## Files Likely Touched

- backend/notebooks/05_anomaly_detection.ipynb
- backend/tests/test_anomaly.py
