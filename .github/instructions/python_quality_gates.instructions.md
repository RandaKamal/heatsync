---
applyTo: "**/*.py"
description: "Python linting, formatting, and test gate policy for HeatSync."
---

# Python Quality Gates

## Purpose and Scope

This file defines the verification policy for Python changes in this repository.

Applies to:

- Python source under `backend/`
- Python tests under `backend/`, when present
- Python helper scripts under `.github/scripts/`

Python application code should not be added outside `backend/`.
`.github/scripts/` is reserved for repository automation helpers.

## Tooling Rules

- Use Python 3.13 for CI parity.
- Use `backend/pyproject.toml` and `backend/uv.lock` as the source of truth for
  backend runtime and development dependencies.
- Sync tools with `uv sync --project backend --frozen --dev` from the repository
  root before running local backend gates.
- Keep Python source, tests, and Python-specific project configuration under
  `backend/` unless a repository-level CI helper is being edited under
  `.github/scripts/`.
- Use GitHub Actions workflows as the CI source of truth.
- Use Ruff for linting and formatting, Mypy for backend type checks, Bandit for
  backend source security checks, `uv audit` for dependency security checks,
  Pytest/Coverage for tests, and Mutmut for optional mutation checks.

## Quality Gates

Run from the repository root when backend Python changes:

```bash
uv sync --project backend --frozen --dev
uv run --project backend ruff check --config backend/pyproject.toml backend
uv run --project backend ruff format --config backend/pyproject.toml --check backend
uv run --project backend mypy --config-file backend/pyproject.toml backend
uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests
uv audit --project backend --preview-features audit
uv run --project backend python -m py_compile $(git ls-files 'backend/*.py' 'backend/**/*.py')
```

If backend tests exist, also run the closest available test command:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest -c backend/pyproject.toml $(git ls-files 'backend/test_*.py' 'backend/*_test.py' 'backend/**/test_*.py' 'backend/**/*_test.py') -q
```

## CI Gates

The active workflows under `.github/workflows/` validate backend Python and
repository helper scripts:

- `backend-ci.yml` compiles backend Python, runs backend tests when present, and
  fails if Python files are added outside `backend/`.
- `ci-lint.yml` runs Ruff lint, Ruff format check, Mypy, Bandit, and `uv audit`
  against `backend/`.
- `ci-tests.yml` compiles and runs backend tests when present.
- `ci-slow-lane.yml` runs backend-focused slower checks only for PRs with commits
  authored by `google-labs-jules[bot]`. It skips the slow job for other PRs so
  routine PR checks stay lightweight.

## Notes

- Report blocked or failed gates explicitly.
- Do not claim verification you did not run.
- If a full suite is blocked by missing dependencies or absent tests, run the
  strongest available backend subset and state the limitation.
