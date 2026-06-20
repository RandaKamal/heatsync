---
id: T01
parent: S05
milestone: M001
key_files:
  - backend/notebooks/05_anomaly_detection.ipynb
  - backend/tests/test_anomaly_detection.py
key_decisions:
  - Used a combined vote counting and normalized combined anomaly score to rank and filter investigation candidates.
  - Corroborated detected sensor anomalies with parsed Modbus error registers to prioritize actionable alarms.
duration: 
verification_result: passed
completed_at: 2026-06-20T15:16:45.417Z
blocker_discovered: false
---

# T01: Created and executed anomaly detection notebook featuring Isolation Forest, One-Class SVM, and PyTorch Autoencoder with Modbus error register cross-referencing.

**Created and executed anomaly detection notebook featuring Isolation Forest, One-Class SVM, and PyTorch Autoencoder with Modbus error register cross-referencing.**

## What Happened

Developed 05_anomaly_detection.ipynb under backend/notebooks to identify HeatSync system anomalies using Isolation Forest, One-Class SVM, and a PyTorch Autoencoder. Standardized a 9-feature subset from the aligned 15-minute heating dataset, parsed error registers to construct a binary indicator for Modbus alarms, and combined detector votes into a ranked shortlist of top-20 investigation candidates. Evaluated the model outputs with a matplotlib timeline visualization and added a comprehensive test suite in backend/tests/test_anomaly_detection.py to assert the behavior of the feature scaling, detector fitting, error parsing, and vote ranking pipeline. The notebook and tests execute without errors.

## Verification

Executed 05_anomaly_detection.ipynb end-to-end using jupyter nbconvert, outputting 05_anomaly_detection.nbconvert.ipynb with no errors. Run backend pytest suite on backend/tests/test_anomaly_detection.py.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300` | 0 | ✅ pass | 11941ms |
| 2 | `uv run --project backend pytest backend/tests/test_anomaly_detection.py -p no:launch_testing` | 0 | ✅ pass | 5076ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/05_anomaly_detection.ipynb`
- `backend/tests/test_anomaly_detection.py`
