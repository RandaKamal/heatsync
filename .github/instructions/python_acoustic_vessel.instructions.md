---
applyTo: "backend/**/*.py"
description: "Python backend conventions and data-contract rules for HeatSync."
---

# Python Backend Conventions

## Scope

This covers:

- Backend source under `backend/`
- Backend tests under `backend/`, when present
- Data files and data dictionaries under `backend/data/`

The filename is retained from the imported instruction set, but the active
contract for this repository is HeatSync backend work.

## Tooling Rules

- Use Python 3.13 for CI parity.
- Use `backend/pyproject.toml` and `backend/uv.lock` for backend runtime and
  development dependencies.
- Run backend Python tools through `uv run --project backend ...`.
- Keep Python application code under `backend/`.
- Keep CI helper Python scripts under `.github/scripts/`.
- Use `.github/instructions/python_quality_gates.instructions.md` for the
  current verification commands.

## Architecture Rules

- Keep backend modules importable from a clean checkout.
- Keep data access explicit and local to `backend/data/` unless a task changes
  that contract.
- Keep reusable business logic in small, deterministic functions that can be
  tested without external services.
- Avoid hidden global mutable state and implicit caches unless they are
  isolated and tested.
- Make failure modes contextual for missing data files, malformed rows, empty
  inputs, and dependency gaps.

## Domain Rules

- Treat `backend/data/DATA_DICTIONARY.md` as the data-shape reference when it is
  present.
- Do not commit generated local datasets, caches, or secrets.
- When adding output files, keep paths configurable and safe to overwrite only
  when the caller opted in or the backend contract clearly owns the path.
- Prefer deterministic fixtures over large local datasets as proof of
  correctness.

## Verification

- For Python changes, run the gates from
  `.github/instructions/python_quality_gates.instructions.md`.
- For behavior changes, add or run targeted backend tests when tests exist.
- State missing data, dependency, or fixture limitations explicitly.
