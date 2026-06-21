# S04: Test Harness and Backend Quality Gates

## Context

We need to research and define tasks to complete the test coverage and verification for the capstone control notebook `07_event_based_device_control.ipynb`. 
The core of this work requires ensuring the notebook test added in `backend/tests/test_notebooks.py` is robust, typing and linting are clean across any helpers created during S01-S03, and that all standard backend CI quality gates pass.

## Discoveries

- **Test Harness Context**: `test_notebooks.py` already includes `07_event_based_device_control.ipynb` in its `NOTEBOOKS` list and test execution passes. However, checking `test_notebooks.py` shows it primarily exercises standard execution.
- **Reload Path**: The notebook `07_event_based_device_control.ipynb` uses a `LOAD_EXISTING_MODEL` flag. Since the default parameterized execution already runs it, we need an explicit second test that forces this flag to `True` (e.g., via environment variable) to ensure the artifact reloading logic works during CI.
- **Quality Gates Scope**: As defined in `.github/instructions/python_quality_gates.instructions.md`, the backend quality gates are:
  - `uv run --project backend ruff check --config backend/pyproject.toml backend`
  - `uv run --project backend ruff format --config backend/pyproject.toml --check backend`
  - `uv run --project backend mypy --config-file backend/pyproject.toml backend`
  - `uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests`
  - `uv audit --project backend --preview-features audit`
  - `uv run --project backend python -m py_compile ...`
- **Helper Quality**: We need to verify `backend/notebooks/utils.py` and `backend/data/loader.py` are fully typed and lint-clean.

## Constraints & Watch-outs

- **Dependencies**: Tools run under the backend `uv` project.
- **Environment**: Some quality gates modify files (like `ruff format` without `--check`). The planner tasks should explicitly use check modes where appropriate to verify state, or apply fixes where required.
- **Pre-commit**: The requirement mentions `pre-commit` passing. This should be explicitly included in the verification block.
- **Reload Test Strategy**: Since the `test_notebooks.py` test is a parameterized execution via `ExecutePreprocessor`, we can add a specific test case that runs `07_event_based_device_control.ipynb` with an environment variable override to simulate `LOAD_EXISTING_MODEL = True`, or ensure the notebook reads from `os.environ` to flip that flag during tests.

## Files
- `backend/tests/test_notebooks.py`: Needs an additional test case for the model reload path.
- `backend/notebooks/07_event_based_device_control.ipynb`: Needs to support loading the flag from the environment, e.g., `os.environ.get("LOAD_EXISTING_MODEL")`.
- `backend/notebooks/utils.py`: Needs typing/linting checks.
- `backend/pyproject.toml`: Contains the configuration for ruff and mypy.

## Recommendation

1.  **Task 1: Implement Model Reload Test Path**: 
    - Update `07_event_based_device_control.ipynb` to derive `LOAD_EXISTING_MODEL` from `os.environ.get("LOAD_EXISTING_MODEL", "False") == "True"`.
    - Add a specific test in `test_notebooks.py` (`test_notebook_reload_path`) that runs the notebook with `LOAD_EXISTING_MODEL=True` in the environment to ensure the load path succeeds without exception. (It can assume the artifacts exist because the parameterized test runs first, or it can run the notebook once to save and again to load).
2.  **Task 2: Enforce Typing and Linting**:
    - Run Ruff (lint and format), Mypy, and Bandit over the backend source (`backend/notebooks/utils.py`, tests, etc.).
    - Fix any type errors or lint violations that surface from the new code written in S01-S03.
3.  **Task 3: Final Verification Gates**:
    - Run the full suite of Python Quality Gates (ruff, mypy, bandit, uv audit, py_compile) to ensure compliance.
    - Run `pre-commit run --all-files` if pre-commit is configured.