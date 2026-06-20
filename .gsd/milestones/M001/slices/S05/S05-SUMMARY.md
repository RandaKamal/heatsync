---
id: S05
parent: M001
milestone: M001
provides:
  - backend/notebooks/05_anomaly_detection.ipynb
  - backend/tests/test_anomaly.py
requires:
  - slice: S01
    provides: backend/notebooks/utils.py
  - slice: S01
    provides: backend/data/processed/
affects:
  []
key_files:
  - backend/notebooks/05_anomaly_detection.ipynb
  - backend/tests/test_anomaly.py
key_decisions:
  - Used combined vote counting and normalized combined anomaly score to rank and filter candidates.
  - Corroborated detected sensor anomalies with parsed Modbus error registers to prioritize actionable alarms.
patterns_established:
  - (none)
observability_surfaces:
  - none
drill_down_paths:
  []
duration: ""
verification_result: passed
completed_at: 2026-06-20T15:29:47.073Z
blocker_discovered: false
---

# S05: Anomaly Detection Models

**Implemented and verified Isolation Forest, One-Class SVM, and PyTorch Autoencoder detectors with Modbus alarm cross-referencing.**

## What Happened

In Slice S05, we successfully constructed the anomaly detection framework for HeatSync. First, we developed the Jupyter notebook '05_anomaly_detection.ipynb' that processes the preprocessed 15-minute aligned data and feeds selected sensor features to three distinct unsupervised detectors: Isolation Forest, One-Class SVM, and a PyTorch Autoencoder. We established a normalized combined anomaly score and a vote-count threshold to aggregate detections into a unified ranked list. Crucially, we cross-referenced these flagged timestamps against Modbus status error registers to isolate and highlight periods with active hardware alarms. Second, we implemented robust unit testing in 'backend/tests/test_anomaly.py' that programmatically exercises all three models and uses the ExecutePreprocessor from nbconvert to verify that the notebook runs end-to-end without raising exceptions. All tests passed, proving the correctness and programmatic stability of the S05 deliverable.

## Verification

All verification checks passed.
1. Run tests with pytest:
Command: `uv run --project backend pytest backend/tests/test_anomaly.py -v` -> Exit 0, 6 tests passed in 17.91 seconds.
2. Programmatic notebook compilation with nbconvert:
Command: `uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300` -> Exit 0, completed successfully.
3. Linting and type checks:
Command: `uv run --project backend ruff check backend/tests/test_anomaly.py && uv run --project backend mypy backend/tests/test_anomaly.py --ignore-missing-imports` -> Exit 0.

## Requirements Advanced

None.

## Requirements Validated

- R005 — Validated via end-to-end nbconvert execution of backend/notebooks/05_anomaly_detection.ipynb and passing pytest suite on backend/tests/test_anomaly.py.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `backend/notebooks/05_anomaly_detection.ipynb` — Notebook executing Isolation Forest, One-Class SVM, and PyTorch Autoencoder to output ranked anomalies with Modbus register correlation.
- `backend/tests/test_anomaly.py` — Unit tests for anomaly detection models and programmatic nbconvert execution verification.
