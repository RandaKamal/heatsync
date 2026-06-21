import os

import nbformat
import pandas as pd
import pytest
from nbconvert.preprocessors import CellExecutionError, ExecutePreprocessor

NOTEBOOKS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "notebooks"))

NOTEBOOKS = [
    "01_preprocessing.ipynb",
    "02_forecasting_sarimax.ipynb",
    "03_forecasting_lstm.ipynb",
    "04_physical_modeling.ipynb",
    "05_anomaly_detection.ipynb",
    "06_energy_controls.ipynb",
    "07_event_based_device_control.ipynb",
]


@pytest.mark.parametrize("notebook_filename", NOTEBOOKS)
def test_notebook_execution(notebook_filename: str) -> None:
    """Execute each HeatSync notebook and assert zero cell execution errors."""
    notebook_path = os.path.join(NOTEBOOKS_DIR, notebook_filename)
    assert os.path.exists(notebook_path), f"Notebook not found at: {notebook_path}"

    with open(notebook_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(timeout=600, kernel_name="python3")

    try:
        ep.preprocess(nb, {"metadata": {"path": NOTEBOOKS_DIR}})
    except CellExecutionError as e:
        pytest.fail(f"Notebook {notebook_filename} failed cell execution:\n{e}")


def test_notebook_reload_path() -> None:
    """Execute 07_event_based_device_control.ipynb with LOAD_EXISTING_MODEL=True."""
    notebook_filename = "07_event_based_device_control.ipynb"
    notebook_path = os.path.join(NOTEBOOKS_DIR, notebook_filename)
    assert os.path.exists(notebook_path), f"Notebook not found at: {notebook_path}"

    with open(notebook_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(timeout=600, kernel_name="python3")

    # Set environment variable to force loading existing models
    os.environ["LOAD_EXISTING_MODEL"] = "True"
    try:
        ep.preprocess(nb, {"metadata": {"path": NOTEBOOKS_DIR}})
    except CellExecutionError as e:
        pytest.fail(f"Notebook 07 reload path failed cell execution:\n{e}")
    finally:
        os.environ.pop("LOAD_EXISTING_MODEL", None)

    # Verify artifacts exist and are non-empty
    artifacts_root = os.path.abspath(
        os.path.join(NOTEBOOKS_DIR, "..", "artifacts", "event_device_control")
    )

    expected_models = [
        "heating_thermal_model.joblib",
        "heating_scaler.joblib",
        "heating_device_power_model.joblib",
        "heating_feature_columns.json",
        "heating_model_metadata.json",
        "cooling_thermal_model.joblib",
        "cooling_scaler.joblib",
        "cooling_device_power_model.joblib",
        "cooling_feature_columns.json",
        "cooling_model_metadata.json",
    ]
    expected_reports = [
        "heating_event_control_results.csv",
        "heating_validation_timeseries.csv",
        "cooling_event_control_results.csv",
        "cooling_validation_timeseries.csv",
    ]

    for model_file in expected_models:
        path = os.path.join(artifacts_root, "models", model_file)
        assert os.path.exists(path), f"Expected model artifact missing: {path}"

    for report_file in expected_reports:
        path = os.path.join(artifacts_root, "reports", report_file)
        assert os.path.exists(path), f"Expected report artifact missing: {path}"
        df = pd.read_csv(path)
        assert not df.empty, f"Expected non-empty report: {path}"
