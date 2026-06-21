---
applyTo: "backend/**/test*.py,backend/**/*_test.py,backend/**/tests/**/*"
description: "Test conventions, organization, and verification patterns for HeatSync."
---

# Test Instructions

## Scope

This covers backend tests under `backend/` and deterministic smoke checks used
to prove backend behavior.

## Tooling Rules

- Use `uv sync --project backend --frozen --dev` before local backend test runs.
- Run backend tests with `pytest` from the backend dev dependency group through
  `uv run --project backend pytest ...`.
- Prefer targeted test paths first; run broader backend tests when touched
  behavior crosses module boundaries.

## Behavioral Overlay

For test changes, also apply:

- `.github/instructions/code_writing_behavior.instructions.md`
- `.github/instructions/python_quality_gates.instructions.md`
- `.github/instructions/python_acoustic_vessel.instructions.md` for backend
  data-contract behavior

## Test Organization

- Keep shared backend fixtures under `backend/tests/` when a test tree exists.
- Use deterministic fixtures for data parsing, prediction, control, anomaly,
  and impact calculations.
- Use `tmp_path` or temporary directories for filesystem behavior.
- Avoid tests that require large local datasets unless they are clearly marked
  and excluded from the default suite.

## Test Conventions

- Assert on contract boundaries: input schema, missing data behavior, numeric
  tolerances, output shape, error messages, and side effects.
- Keep tests small and focused on one behavior.
- Include explicit failure assertions for malformed inputs and unavailable
  optional dependencies.
- For regressions, add the narrowest test that would have failed before the fix.

## Running Tests

Examples from the repository root:

```bash
PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run --project backend pytest -c backend/pyproject.toml $(git ls-files 'backend/test_*.py' 'backend/*_test.py' 'backend/**/test_*.py' 'backend/**/*_test.py') -q
```
