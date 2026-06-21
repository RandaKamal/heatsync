---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Built 06_energy_controls.ipynb with 2R2C calibration, occupancy heat gains, setback scenarios, savings, and comfort compliance analysis.

## Inputs

- None specified.

## Expected Output

- `backend/notebooks/06_energy_controls.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute --ExecutePreprocessor.timeout=300 backend/notebooks/06_energy_controls.ipynb && echo 'Notebook executed successfully'
