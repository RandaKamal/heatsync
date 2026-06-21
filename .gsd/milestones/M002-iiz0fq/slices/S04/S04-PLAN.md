# S04: Test Harness and Backend Quality Gates

**Goal:** S04: Test Harness and Backend Quality Gates
**Demo:** pytest test_notebooks.py (extended with 07_event_based_device_control.ipynb) passes; reload-path test passes; backend gates (ruff check, ruff format, mypy, bandit, py_compile, pre-commit) all pass. All notebook helpers in utils.py are typed and lint-clean.

## Must-Haves

- Complete the planned slice outcomes.

## Verification

- Run the task and slice verification checks for this slice.

## Tasks

- [x] **T01: Implemented model reload test path in notebook 07 and added corresponding pytest verification.** `est:1 hour`
  Update the 07_event_based_device_control.ipynb notebook to read `LOAD_EXISTING_MODEL` from the environment if present. Then add a specific pytest function `test_notebook_reload_path` in `backend/tests/test_notebooks.py` that sets `os.environ["LOAD_EXISTING_MODEL"] = "True"` and executes the notebook, ensuring the reload branch is hit and works without errors.
  - Files: `backend/tests/test_notebooks.py`, `backend/notebooks/07_event_based_device_control.ipynb`
  - Verify: PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -v -k test_notebook_reload_path

- [x] **T02: Implemented and verified output artifact contracts and data leakage guards in tests.** `est:1 hour`
  Add robust verification for output artifacts and no-leakage behavior in the reload test. Check that the expected CSV reports and model joblib files exist. Also add a helper logic test in `backend/tests/test_event_control_reporting.py` (or a dedicated new test) that explicitly mocks `power_draw_kw` of future times to NaN or raises an exception if accessed during the prediction phase, verifying the event-based control is leakage-free.
  - Files: `backend/tests/test_event_control_reporting.py`, `backend/tests/test_notebooks.py`
  - Verify: PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py backend/tests/test_notebooks.py

- [x] **T03: Fixed all ruff lint/format errors and verified type correctness with mypy and security checks with bandit.** `est:1.5 hours`
  Run the full suite of backend quality gates (ruff check, ruff format, mypy, bandit) against `backend/notebooks/utils.py`, `backend/tests/`, and all newly added helpers. Fix any typing or linting violations that emerge from the M002 slices. Ensure type hints are accurate and missing docstrings are added if required by the linter.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_notebooks.py`, `backend/tests/test_event_control_reporting.py`
  - Verify: uv run --project backend ruff check backend && uv run --project backend ruff format --check backend && uv run --project backend mypy --config-file backend/pyproject.toml backend && uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests

- [ ] **T04: Execute Final Quality Gates (Audit, Compile, Pytest, Pre-commit)** `est:1 hour`
  Run the final overarching quality gate verifications. This involves running `uv audit`, `python -m py_compile`, the full pytest test suite, and the `pre-commit run --all-files` hooks if pre-commit is configured. Fix any final issues caught by these overarching gates to prove operational readiness of the notebook and its helpers.
  - Files: `backend/pyproject.toml`
  - Verify: uv audit --project backend && uv run --project backend python -m compileall backend/notebooks backend/tests && PYTHONPATH=. uv run --project backend pytest backend/tests

## Files Likely Touched

- backend/tests/test_notebooks.py
- backend/notebooks/07_event_based_device_control.ipynb
- backend/tests/test_event_control_reporting.py
- backend/notebooks/utils.py
- backend/pyproject.toml
