# S05: Anomaly Detection Models

**Goal:** Create 05_anomaly_detection.ipynb that runs Isolation Forest, One-Class SVM, and PyTorch Autoencoder on S01's 15-minute aligned data, flags anomalous timestamps with a ranked shortlist, cross-references Modbus error registers, and produces timeline plots — all executing end-to-end with zero exceptions.
**Demo:** Runs 05_anomaly_detection.ipynb listing flagged anomaly timestamps from Isolation Forest, One-Class SVM, and Autoencoder.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Created and executed anomaly detection notebook featuring Isolation Forest, One-Class SVM, and PyTorch Autoencoder with Modbus error register cross-referencing.**
  - Files: `backend/notebooks/05_anomaly_detection.ipynb`
  - Verify: uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300

- [x] **T02: Implemented unit tests for anomaly detection models and end-to-end notebook verification**
  - Files: `backend/tests/test_anomaly.py`
  - Verify: uv run --project backend pytest backend/tests/test_anomaly.py -v && uv run --project backend ruff check backend/tests/test_anomaly.py && uv run --project backend mypy backend/tests/test_anomaly.py --ignore-missing-imports

## Files Likely Touched

- backend/notebooks/05_anomaly_detection.ipynb
- backend/tests/test_anomaly.py
