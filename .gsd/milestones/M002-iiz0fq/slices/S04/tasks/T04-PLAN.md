---
estimated_steps: 1
estimated_files: 1
skills_used: []
---

# T04: Execute Final Quality Gates (Audit, Compile, Pytest, Pre-commit)

Run the final overarching quality gate verifications. This involves running `uv audit`, `python -m py_compile`, the full pytest test suite, and the `pre-commit run --all-files` hooks if pre-commit is configured. Fix any final issues caught by these overarching gates to prove operational readiness of the notebook and its helpers.

## Inputs

- `backend/pyproject.toml`

## Expected Output

- `backend/pyproject.toml`

## Verification

uv audit --project backend && uv run --project backend python -m compileall backend/notebooks backend/tests && PYTHONPATH=. uv run --project backend pytest backend/tests
