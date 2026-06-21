---
estimated_steps: 1
estimated_files: 3
skills_used: []
---

# T01: Delivered the shared notebook preprocessing utility surface for HeatSync CSV loading, 15-minute alignment, interpolation metadata, occupancy flags, feature engineering, and processed CSV caching.

## Inputs

- None specified.

## Expected Output

- `backend/notebooks/utils.py`
- `backend/notebooks/__init__.py`
- `backend/data/processed/.gitkeep`

## Verification

uv run --project backend python -c "import notebooks.utils; print('import ok')" && uv run --project backend ruff check --config backend/pyproject.toml backend/notebooks/utils.py && uv run --project backend ruff format --config backend/pyproject.toml --check backend/notebooks/utils.py
