---
name: python-linting
description: Run Python linting checks for HeatSync backend code. Use when editing backend Python, backend tests, or repository Python tooling.
---

# Python Linting Skill

## Scope

- Backend source and tests: `backend/`
- Repository Python helper scripts: `.github/scripts/`
- CI reference: `.github/workflows/ci-lint.yml`

## Quality Gates

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

If `uv` is not installed locally, install `uv` first and rerun the backend sync
command. Do not install linting tools globally for this repository.

## Guardrails

- Do not change runtime behavior solely to satisfy linting unless the lint issue
  exposes a real bug.
- Re-run the relevant check after fixes.
- Pair linting with targeted tests or a deterministic smoke check when the
  change affects behavior.
