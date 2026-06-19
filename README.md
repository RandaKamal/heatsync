# HeatSync

HeatSync is a Python project for heating and cooling data workflows. Current
implementation work lives under `backend/`.

## Current Scope

- `backend/` contains application Python source, tests, and Python project
  configuration.
- Application Python source and tests should stay under `backend/`; CI helper
  Python scripts live under `.github/scripts/`.

## CI

GitHub Actions runs backend Python validation from `.github/workflows/`.
The workflows sync the locked backend `uv` environment, compile tracked backend
Python, run backend tests when they exist, and fail if application Python files
are added outside `backend/`.

## Backend Tooling

Backend runtime and development dependencies are declared in
`backend/pyproject.toml` and locked in `backend/uv.lock`.

From the repository root:

```bash
uv sync --project backend --frozen --dev
uv run --project backend ruff check --config backend/pyproject.toml backend
uv run --project backend ruff format --config backend/pyproject.toml --check backend
uv run --project backend mypy --config-file backend/pyproject.toml backend
uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests
uv audit --project backend --preview-features audit
uv run --project backend python -m py_compile $(git ls-files 'backend/*.py' 'backend/**/*.py')
```

When backend tests exist:

```bash
uv run --project backend pytest $(git ls-files 'backend/test_*.py' 'backend/*_test.py' 'backend/**/test_*.py' 'backend/**/*_test.py') -q
```
