---
id: S04
milestone: M002-iiz0fq
status: ready
---

# S04: Test Harness and Backend Quality Gates — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Prove the completed event-based device-control notebook and helpers are shippable by running the notebook end-to-end, verifying reload/no-leakage/artifacts, and passing the full backend quality gate suite.

## Why this Slice

S04 is the final integration and confidence slice after S01 data/models, S02 optimizer/schedules, and S03 comparison reports/plots exist. It turns the notebook demo into a reproducible backend-verified deliverable by proving the capstone can be executed by tests, reloaded without retraining, and checked with the same backend discipline used elsewhere in the project.

## Scope

### In Scope

- Treat all listed backend gates as blocking for completion: `uv sync --project backend --frozen --dev`, notebook pytest, reload-path test, ruff check, ruff format, mypy, bandit, `uv audit`, `py_compile`, pytest, and pre-commit.
- Add or extend pytest coverage so `backend/notebooks/07_event_based_device_control.ipynb` executes end-to-end with zero exceptions.
- Prove `LOAD_EXISTING_MODEL=True` loads existing artifacts and skips model retraining while still producing expected reports and figures.
- Verify required generated model, CSV, and PNG artifacts exist after execution.
- Inspect report CSVs at a contract level: files are nonempty and include required schedule, savings, comfort, and status columns.
- Use nontrivial-size checks for PNG figures without brittle pixel-level or visual regression assertions.
- Prove no-future-power leakage with a static/helper-level guard plus behavior evidence that the smart-control path uses predicted/simulated power rather than future measured `power_draw_kw`.
- Preserve copy-pasteable local verification commands using `uv run --project backend ...` and any required environment setup such as `PYTHONPATH=.`.
- If a gate fails, stop at the blocking failure and produce an actionable failure report with exact failed command, key output, affected test/artifact, likely root cause, and next fix target.

### Out of Scope

- Waiving listed gates merely because they are slow or inconvenient.
- Deep visual regression tests for PNG content or pixel-level plot comparisons.
- Full numeric snapshot regression of all event metrics unless a future failure shows contract checks are insufficient.
- Reworking S01/S02/S03 feature behavior except to fix issues exposed by the blocking gates.
- CI/deployment work outside the existing backend validation and pre-commit quality-gate scope.
- Treating generated artifact existence alone as sufficient proof when CSV contract columns, reload behavior, or leakage guard checks are missing.

## Constraints

- Completion requires fresh evidence from commands; “all implementation steps done” is not verification.
- All quality gates are blocking per user preference unless a true environment/tooling problem is explicitly escalated with exact command output rather than silently bypassed.
- Reload proof must show training is skipped when saved artifacts exist and `LOAD_EXISTING_MODEL=True` is used.
- Leakage proof must distinguish measured baseline power from predicted/simulated smart-control power.
- Verification should be reproducible locally with copy-pasteable backend `uv` commands.
- Artifact checks should avoid brittle plot-image comparisons and should focus on required files, nonempty outputs, required columns, and nontrivial PNG size.

## Integration Points

### Consumes

- `backend/notebooks/07_event_based_device_control.ipynb` — executed end-to-end and in reload mode as the primary capstone artifact.
- `backend/notebooks/utils.py` — helper functions to lint, type-check, unit-test, and inspect for leakage-safe smart simulation behavior.
- `backend/tests/test_notebooks.py` — existing notebook execution test pattern to extend or verify for the 07 notebook.
- `backend/tests/` — location for reload, artifact contract, and leakage guard tests.
- `backend/artifacts/event_device_control/models/` — model artifacts that must exist and be loaded without retraining.
- `backend/artifacts/event_device_control/reports/` — generated event and time-series CSVs to verify for existence, nonempty rows, and required contract columns.
- `backend/artifacts/event_device_control/figures/` — generated validation PNGs to verify for existence and nontrivial file size.

### Produces

- Passing pytest coverage for the 07 notebook end-to-end path.
- Passing reload-path test evidence that existing model artifacts are loaded without retraining.
- Artifact contract checks for required model files, report CSVs, and validation PNGs.
- Leakage guard test/evidence proving smart control does not consume future measured power.
- Fresh backend gate evidence for lint, format, type, security, audit, compile, pytest, and pre-commit commands.
- Copy-pasteable command sequence for local reproduction of the S04 verification path.
- Actionable failure report if any gate blocks completion.

## Open Questions

- Exact implementation mechanism for proving retraining is skipped — current thinking: use a visible load-path flag/message or monkeypatch/sentinel around training functions during the reload test.
- Exact status of `uv audit` in the installed backend environment — current thinking: treat it as blocking per user preference, but report environment/tooling failures with exact command output if the command itself is unavailable.
