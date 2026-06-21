# HeatSync Backend

This directory is the active Python project for HeatSync.

## Dependency Management

Use `uv` from the repository root so the backend package, dev tools, and lockfile
stay aligned:

```bash
uv sync --project backend --frozen --dev
```

Runtime dependencies and development tools are declared in `pyproject.toml` and
locked in `uv.lock`.

## Quality Gates

Run these from the repository root before opening backend PRs:

```bash
uv run --project backend ruff check --config backend/pyproject.toml backend
uv run --project backend ruff format --config backend/pyproject.toml --check backend
uv run --project backend mypy --config-file backend/pyproject.toml backend
uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests
uv audit --project backend --preview-features audit
uv run --project backend python -m py_compile $(git ls-files 'backend/*.py' 'backend/**/*.py')
```

When tests exist under `backend/`, run:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest -c backend/pyproject.toml $(git ls-files 'backend/test_*.py' 'backend/*_test.py' 'backend/**/test_*.py' 'backend/**/*_test.py') -q
```
