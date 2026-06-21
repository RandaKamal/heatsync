---
estimated_steps: 1
estimated_files: 2
skills_used: []
---

# T01: Implemented model reload test path in notebook 07 and added corresponding pytest verification.

Update the 07_event_based_device_control.ipynb notebook to read `LOAD_EXISTING_MODEL` from the environment if present. Then add a specific pytest function `test_notebook_reload_path` in `backend/tests/test_notebooks.py` that sets `os.environ["LOAD_EXISTING_MODEL"] = "True"` and executes the notebook, ensuring the reload branch is hit and works without errors.

## Inputs

- `backend/tests/test_notebooks.py`
- `backend/notebooks/07_event_based_device_control.ipynb`

## Expected Output

- `backend/tests/test_notebooks.py`
- `backend/notebooks/07_event_based_device_control.ipynb`

## Verification

PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -v -k test_notebook_reload_path
