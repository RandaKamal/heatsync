---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T02: Created test_energy.py with scenario logic and notebook execution tests

## Inputs

- None specified.

## Expected Output

- `backend/tests/test_energy.py`

## Verification

uv run --project backend pytest backend/tests/test_energy.py -v && uv run --project backend ruff check backend/tests/test_energy.py && uv run --project backend ruff format --check backend/tests/test_energy.py
