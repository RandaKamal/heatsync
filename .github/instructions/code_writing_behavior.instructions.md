---
description: "Behavioral overlay for code writing, review, and refactor tasks."
---

# Code Writing Behavior

## Purpose

This file defines the expected engineering behavior for day-to-day work in this
repository.

Use it when a task involves:

- writing or editing code
- reviewing code
- refactoring or cleanup work
- changing backend modules, data contracts, or CI

## Core Behavior

- Make assumptions explicit when project behavior, dataset shape, output paths,
  or backend API behavior affect the result.
- Prefer the smallest correct change. Do not add speculative abstractions.
- Keep edits surgical and grounded in the current `backend/` layout.
- Match local style and existing patterns unless a scoped instruction says
  otherwise.
- If you notice unrelated issues, call them out separately instead of widening
  the change set.
- Preserve current backend entry points unless a task explicitly requires a
  breaking change.
- Keep deterministic data transformations separate from API, file I/O, and
  external-service concerns when extracting helpers.
- For backend Python work, use the locked backend `uv` environment instead of
  globally installed lint, test, type, or security tools.

## Execution Pattern

Before implementing:

- state working assumptions when they materially affect the solution
- identify the simplest viable approach
- define what will verify success

During implementation:

- touch only the files and code paths needed for the task
- remove imports or helpers made unused by your own changes
- preserve any existing test seams and deterministic fixtures
- keep ad hoc debugging separate from reusable logic whenever possible
- avoid hardcoded new local paths, dataset locations, or machine-specific
  settings

Before completion:

- verify the claimed outcome with the lightest sufficient evidence
- report open questions, constraints, backend caveats, dataset assumptions, or
  blocked gates explicitly

## Stack-Specific Work

- For backend Python or data-contract work, load
  `.github/instructions/python_acoustic_vessel.instructions.md`.
- For tests or verification work, load `.github/instructions/tests.instructions.md`
  and `.github/instructions/python_quality_gates.instructions.md`.
