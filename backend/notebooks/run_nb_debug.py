import nbformat
from nbconvert.preprocessors import ExecutePreprocessor, CellExecutionError

try:
    with open("backend/notebooks/07_event_based_device_control.ipynb") as f:
        nb = nbformat.read(f, as_version=4)
    ep = ExecutePreprocessor(timeout=600, kernel_name="python3")
    ep.preprocess(nb, {"metadata": {"path": "backend/notebooks"}})
    print("Notebook executed successfully.")
except CellExecutionError as e:
    print("Error name:", e.ename)
    print("Error value:", e.evalue)
    print("Traceback:")
    print(e.traceback)
