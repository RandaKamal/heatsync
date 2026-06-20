# S05: Anomaly Detection Models — UAT

**Milestone:** M001
**Written:** 2026-06-20T15:29:47.073Z

# UAT-01: Programmatic Verification of Anomaly Detection Models and Jupyter Notebook

## Preconditions
- The 15-minute aligned datasets produced by S01 exist in `backend/data/processed/`.
- The python environment has PyTorch, scikit-learn, and nbconvert installed.

## Execution Steps
1. Run the test suite using pytest to execute unit tests for Isolation Forest, One-Class SVM, PyTorch Autoencoder, and programmatic notebook execution:
   ```bash
   uv run --project backend pytest backend/tests/test_anomaly.py -v
   ```
2. Programmatically execute the Jupyter notebook to check for exceptions and ensure output artifact output:
   ```bash
   uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/05_anomaly_detection.ipynb --output 05_anomaly_detection.nbconvert.ipynb --ExecutePreprocessor.timeout=300
   ```

## Expected Outcomes
- Pytest returns exit code 0, confirming all 6 unit tests pass.
- Nbconvert compiles the notebook successfully with zero exceptions and creates the temporary executed notebook file.
- The notebook execution produces a ranked shortlist of anomalous timestamps with Modbus alarm status and renders a timeline plot.

