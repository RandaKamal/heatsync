import os

import nbformat  # type: ignore[import-untyped]
import pytest
from nbconvert.preprocessors import (
    CellExecutionError,  # type: ignore[import-untyped]
    ExecutePreprocessor,  # type: ignore[import-untyped]
)

NOTEBOOKS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "notebooks"))

NOTEBOOKS = [
    "01_preprocessing.ipynb",
    "02_forecasting_sarimax.ipynb",
    "03_forecasting_lstm.ipynb",
    "04_physical_modeling.ipynb",
    "05_anomaly_detection.ipynb",
    "06_energy_controls.ipynb",
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
