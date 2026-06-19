# Repository Instructions

## Project Scope

- Current HeatSync implementation work lives under `backend/`.
- Keep application Python source files, Python tests, and Python-specific
  project configuration under `backend/`.
- CI helper Python scripts may live under `.github/scripts/`.

## Backend Checks

- Use the backend `uv` project as the source of truth for Python dependencies:
  `uv sync --project backend --frozen --dev`.
- Run linters, type checks, security checks, compiles, and tests through
  `uv run --project backend ...`.
- At minimum, backend validation should compile Python files under `backend/`
  with the backend `uv` environment.
- When tests exist under `backend/`, CI should discover and run them with
  `pytest` from the backend dev dependency group.
- CI should fail if application Python files are added outside `backend/`.
  `.github/scripts/` is reserved for repository automation helpers.

## Scoped Instructions

- Use `.github/instructions/code_writing_behavior.instructions.md` for code,
  refactor, review, and CI work.
- Use `.github/instructions/python_acoustic_vessel.instructions.md` for backend
  Python and backend data-contract work. The filename is retained from an
  imported instruction set; its content is HeatSync-specific.
- Use `.github/instructions/python_quality_gates.instructions.md` for current
  backend verification commands.
- Use `.github/instructions/tests.instructions.md` for backend test work.
- Use `.github/instructions/qa_readonly.instructions.md` for read-only review
  and audit tasks.
- Project-scoped agents live under `.github/agents/`.
- Project-scoped skills live under `.github/skills/`.

## GitHub Automation

- GitHub Actions workflows live in `.github/workflows/`.
- Current workflows should trigger for backend-relevant changes, instruction
  changes that affect validation, and workflow changes.
- Keep workflow permissions minimal; read-only repository contents is enough for validation jobs.
