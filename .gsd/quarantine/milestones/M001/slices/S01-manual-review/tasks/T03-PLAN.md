---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T03: Implement data preprocessing notebook

Create backend/notebooks/01_preprocessing.ipynb that loads heating and cooling data, processes them using utils.py, and saves the aligned dataframes to processed CSVs.

## Inputs

- `backend/notebooks/utils.py`

## Expected Output

- `backend/notebooks/01_preprocessing.ipynb`
- `backend/data/processed_heating.csv`
- `backend/data/processed_cooling.csv`

## Verification

uv run --project backend python -c "import nbformat; nb = nbformat.read('backend/notebooks/01_preprocessing.ipynb', as_version=4); print(f'Read notebook with {len(nb.cells)} cells')"

## Observability Impact

Log execution time and row counts for output CSV files.
