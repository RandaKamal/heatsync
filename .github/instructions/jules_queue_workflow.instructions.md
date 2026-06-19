---
description: "Queue-driven workflow for autonomous Jules task sessions."
---

# Jules Queue Workflow

## Purpose

Use this instruction file for Jules automation, GSD queue maintenance, and PRs
that complete queued autonomous tasks.

## Queue Source

`.gsd/QUEUE.md` is the top-level task queue for Jules automation. Concrete task
plans normally live under `.gsd/milestones/<milestone>/` and, when present,
under slice or task-specific files below that milestone.

Do not select work from issues, README ideas, TODO comments, or broad repository
inspection unless the selected `.gsd/QUEUE.md` item explicitly points there.
Use the rest of `.gsd/` as supporting context only.

## Selection Rules

- Select the first queued item in `.gsd/QUEUE.md`.
- Use `.gsd/STATE.md` to resolve the active milestone, slice, phase, and next
  action.
- If `.gsd/STATE.md` names a concrete task, read the matching task plan and
  execute that task.
- If `.gsd/STATE.md` says the active slice has no tasks yet, plan the next
  concrete slice tasks first and update the relevant `.gsd/` state artifacts.
- Prefer markdown checklist entries such as `- [ ] TASK-ID: Title`.
- If `.gsd/QUEUE.md` uses GSD status bullets, select the first item that is not
  marked complete and is not under an archive/completed section.
- Implement exactly one queued task or one concrete task resolved from it per
  Jules session.
- Do not reorder tasks.
- Do not mark unrelated tasks complete.
- If there are no queued tasks, do not open a PR.

## Implementation Rules

- Read `AGENTS.md` and all scoped instruction files relevant to the selected
  backend, data, testing, or CI subsystem.
- Inspect existing source files and tests before editing.
- Keep changes narrowly scoped to the selected task.
- Preserve backend data-shape, generated-output, and dataset-safety contracts.
- Update tests or docs when behavior changes.
- Edit only the `.gsd/` files needed to record completion of the selected task.
  For normal task execution this is usually the active slice plan and task
  summary or verification files, not unrelated planning state.

## Completion Rules

Before opening a PR, Jules must:

- run the mandatory backend quality gates:

  ```bash
  uv sync --project backend --frozen --dev
  uv run --project backend ruff check --config backend/pyproject.toml backend
  uv run --project backend ruff format --config backend/pyproject.toml --check backend
  uv run --project backend mypy --config-file backend/pyproject.toml backend
  uv run --project backend bandit -q -r backend -x backend/.venv,backend/tests
  uv audit --project backend --preview-features audit
  uv run --project backend python -m py_compile $(git ls-files 'backend/*.py' 'backend/**/*.py')
  ```

  If backend tests exist, run them as described in
  `.github/instructions/python_quality_gates.instructions.md`.
- treat failures in that batch as blocking unless the failure is explicitly
  unrelated to the selected slice and is documented as inherited repository
  debt in the task-state evidence and PR body
- update the relevant `.gsd/` task-state files by marking only the selected task
  complete
- add concise completion evidence near the selected task or in its task summary
- fill in `.github/PULL_REQUEST_TEMPLATE.md`, including the selected queue task
  ID/title and the backend quality command output summary
- leave the task unchecked if the work is incomplete

## Post-PR Creation Rules

Once Jules has opened a PR, it must adhere to the following workflow for CI and review feedback:

- **Fix CI Pipeline Issues**: Jules must fix any quality checks or CI pipeline failures that occur immediately after the PR is created.
- **Human-Only Modifications After Fixes**: As soon as the PR is created and all initial CI issues are fixed, only human reviewers have the right to modify the code in the PR.
- **Pull and Analyze Human Changes**: If changes are pushed to the PR (e.g., by a human reviewer), Jules must pull those changes, run the full quality checks on them, and analyze if there are any issues.
- **No Code Commits After Human Intervention**: When analyzing human changes, Jules must **not** commit code to the PR. It must only create comments with its findings.

## Auto-Merge Contract

Jules PRs are eligible for repository automation to merge after lint, tests,
PR-structure checks, and the `Backend quality slow lane` check succeed. The PR
must be non-draft, must satisfy the PR template, must update relevant `.gsd/`
task-state files, and must not rely on missing validation.
