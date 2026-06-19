# Gemini Instructions

Follow the repository rules in `AGENTS.md`.

Key project constraints:

- Focus on the Python backend under `backend/`.
- Keep application Python files under `backend/`; `.github/scripts/` is only
  for CI helper scripts.
- Use `backend/pyproject.toml` and `backend/uv.lock` for Python dependencies,
  and run backend tooling through `uv run --project backend ...`.
- Load relevant scoped instructions from `.github/instructions/` for backend,
  test, review, CI, and agent-maintenance work.
