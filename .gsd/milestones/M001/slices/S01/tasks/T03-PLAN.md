---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Created 01_preprocessing.ipynb teaching walkthrough notebook and cached processed heating/cooling datasets.

## Inputs

- None specified.

## Expected Output

- `backend/notebooks/01_preprocessing.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/01_preprocessing.ipynb --ExecutePreprocessor.timeout=120 --output /tmp/test_01_output.ipynb
