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

## Project-Scoped Agents

Project-scoped agent definitions live under `.github/agents/`. When a task
matches one of these specialties, load the matching agent file before acting or
before delegating to a similarly named runtime agent:

- `.github/agents/heatmap-detection-engineer.agent.md` for HeatSync backend
  modules, data contracts, control, prediction, anomaly detection, impact
  calculations, and API work.
- `.github/agents/signal-processing-engineer.agent.md` for backend
  calculations, prediction logic, anomaly thresholds, numeric stability, and
  data transformation work.
- `.github/agents/analysis-eval-engineer.agent.md` for backend data paths,
  fixtures, generated outputs, evaluation summaries, scripts, and reporting
  utilities.
- `.github/agents/test-engineer.agent.md` for backend tests, deterministic
  fixtures, regression tests, quality gates, and verification strategy.
- `.github/agents/code-reviewer.agent.md` for read-only review of backend
  correctness, regressions, data-contract risks, security, performance, and
  missing tests.
- `.github/agents/docs-maintainer.agent.md` for README updates, agent
  instruction files, setup guidance, GitHub metadata, and repository docs.

## Project-Scoped Skills

Project-scoped skills live under `.github/skills/`. When a task names one of
these skills or clearly matches its description, load its `SKILL.md` before
acting:

- `.github/skills/python-linting/SKILL.md` for backend Python linting,
  formatting checks, type checks, security scans, dependency audits, and Python
  compile validation.
- `.github/skills/python-testing/SKILL.md` for backend-aware pytest target
  selection, regression tests, deterministic fixtures, and failure debugging.
- `.github/skills/vessel-contract-check/SKILL.md` for backend schema,
  data-contract, calculation, control, prediction, anomaly, output, API, and
  dataset-risk checks.

## GitHub Automation

- GitHub Actions workflows live in `.github/workflows/`.
- Current workflows should trigger for backend-relevant changes, instruction
  changes that affect validation, and workflow changes.
- Keep workflow permissions minimal; read-only repository contents is enough for validation jobs.
