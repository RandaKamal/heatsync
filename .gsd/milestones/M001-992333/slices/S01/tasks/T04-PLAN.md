---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T04: Add automated execution test for preprocessing notebook

Write pytest tests in backend/tests/test_notebooks.py to execute 01_preprocessing.ipynb programmatically via nbclient/nbconvert, ensuring it completes without errors and produces the expected outputs.

## Inputs

- `backend/notebooks/01_preprocessing.ipynb`

## Expected Output

- `backend/tests/test_notebooks.py`

## Verification

uv run --project backend pytest backend/tests/test_notebooks.py -v
