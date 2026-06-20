---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T01: Created test_notebooks.py with parametrized execution tests for all 6 HeatSync notebooks

## Inputs

- None specified.

## Expected Output

- `backend/tests/test_notebooks.py`

## Verification

uv run --project backend python -c "import ast; ast.parse(open('backend/tests/test_notebooks.py').read()); print('syntax ok')" && uv run --project backend ruff check backend/tests/test_notebooks.py && uv run --project backend ruff format --check backend/tests/test_notebooks.py
