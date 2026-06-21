import os

import nbformat
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
