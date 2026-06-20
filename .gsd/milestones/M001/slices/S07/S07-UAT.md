# S07: Automated Notebook Suite Verification — UAT

**Milestone:** M001
**Written:** 2026-06-20T16:15:56.539Z

### S07: Automated Notebook Suite Verification UAT

#### Preconditions
- The workspace must have `backend/data/` initialized and S01-S06 notebooks built.
- Python dependencies installed (`uv sync --project backend`).

#### Steps
1. Run pytest suite execution:
   ```bash
   uv run --project backend pytest backend/tests/test_notebooks.py -v
   ```
2. Verify static quality gates (lint, formatting, type checking):
   ```bash
   uv run --project backend ruff check backend/tests/test_notebooks.py
   uv run --project backend ruff format --check backend/tests/test_notebooks.py
   uv run --project backend mypy backend/tests/test_notebooks.py
   ```

#### Expected Outcome
- The pytest command exits with code 0 and reports all 6 tests passed.
- Ruff and mypy find zero lint, format, or type-checking issues on the test file.

#### UAT Type
- runtime

