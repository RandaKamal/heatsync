---
id: S02
milestone: M002-iiz0fq
status: ready
---

# S02: Event-Based Optimizer and Control Schedule — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver an event-based optimizer that evaluates candidate preconditioning start times and device subsets for both heating and cooling validation events, then emits a clear per-event control-action schedule with predicted comfort and expected kWh, cost, and CO₂.

## Why this Slice

S01 proved the aligned data, grey-box thermal model, device power model, and save/reload path; S02 now turns those learned models into the actual event-aware control decisions that S03 needs for baseline-vs-smart plots and CSV reports.

## Scope

### In Scope

- Evaluate configured candidate preconditioning start offsets and all allowed device subsets for validation events in both heating and cooling seasons.
- Select the cheapest schedule that reaches the configured comfort band by event start.
- When no candidate reaches comfort, select the smallest comfort violation and mark the event infeasible transparently.
- Use season-level mode assignment unless a stronger existing source is already available: heating validation events use `heating`; cooling validation events use `cooling`.
- Use visible top-of-notebook comfort, control, and energy config values; represent target comfort as seasonal comfort bands, with `target_temp` set to the relevant band boundary for the mode.
- Apply simple visible control constraints, including max simultaneous devices and min on/off duration, without over-modeling hardware internals.
- Merge overlapping or close back-to-back events into a shared comfort window for optimization while preserving per-event output rows.
- Emit the required schedule fields: `event_id`, `mode`, `start_time`, `device_1_on`, `device_2_on`, `device_3_on`, `device_4_on`, `target_temp`, `predicted_temp_at_start`, `expected_kwh`, `expected_cost`, and `expected_co2`.
- Add human-readable decision-rationale fields in the notebook output, such as feasibility status, selection reason, comfort violation, candidate start offset, and active device count when useful.
- Show a compact notebook-only top-candidates/debug view for trust and inspection, without broadening saved artifact requirements in this slice.

### Out of Scope

- Strict hardware-grade switching simulation or detailed compressor cycling behavior.
- Relaxing constraints automatically to force comfort unless explicitly added later; normal S02 behavior should be visible config constraints plus transparent infeasibility.
- Saving full candidate-evaluation CSV artifacts as a required output; selected schedules and later S03 reports remain the core artifact path.
- Replacing the S01 thermal or device power models, changing the leakage-safe modeling decision, or using future measured power in the smart-control path.
- Building S03 baseline-vs-smart visualizations, cumulative reports, or final CSV report suite beyond the schedule data S03 consumes.
- Real-time deployment, APIs, frontend interactions, or multi-room control.

## Constraints

- S02 depends on S01 outputs: aligned seasonal dataframes, trained/reloaded thermal models, and learned device power models.
- The smart-control counterfactual must use learned/predicted device power, not future measured `power_draw_kw`.
- Candidate selection priority is: feasible by comfort band first, then lowest expected energy/cost/CO₂.
- Among equally cheap feasible schedules, prefer the latest feasible start time so operation stays tightly around events; then prefer simpler/deterministic device choices.
- Infeasible schedules must not be hidden: selected fallback rows should include clear infeasibility and violation indicators.
- Heating and cooling use season-derived mode labels unless existing data already contains a trustworthy explicit mode.
- Timestamps must remain consistently normalized and compatible with S01 validation splits.
- The schedule table must remain judge-readable: rationale should explain why a schedule won without drowning the notebook in every candidate row.

## Integration Points

### Consumes

- `backend/notebooks/07_event_based_device_control.ipynb` — S02 extends the S01 notebook scaffold with optimizer execution, schedule selection, and human-readable outputs.
- `backend/notebooks/utils.py` — Consumes S01 helper functions for aligned data, thermal simulation, device power prediction, artifact load/save, and adds/reuses optimizer helpers as appropriate.
- `backend/artifacts/event_device_control/models/` — Loads trained/reloaded thermal and device power artifacts produced in S01.
- `backend/data/processed/{heating,cooling}_processed.csv` — Provides season-specific validation events and state inputs through existing loaders.

### Produces

- `backend/notebooks/07_event_based_device_control.ipynb` — Notebook cells that run the event optimizer for both seasons and display selected schedules plus compact rationale/debug views.
- `backend/notebooks/utils.py` — Reusable optimizer, candidate evaluation, feasibility, event-clustering, and schedule-formatting helpers if implementation keeps logic outside notebook cells.
- `backend/artifacts/event_device_control/reports/{heating,cooling}_event_control_results.csv` — Selected event-control schedule rows, if S02 chooses to persist the schedule table immediately for S03 consumption.
- In-memory or notebook-visible schedule dataframes — Inputs for S03 baseline-vs-smart plots, time-series simulation, and final reports.

## Open Questions

- Exact numeric comfort-band and switching-constraint defaults — current thinking: keep them visible in top-level config and use the existing milestone constants unless execution reveals a data-specific reason to adjust.
- Definition of “close” for merging back-to-back events — current thinking: use the configured min off/on or preconditioning window threshold so the rule is visible and deterministic.
- Whether to persist S02 schedule CSVs immediately or leave persistence to S03 — current thinking: persisting selected schedule CSVs is acceptable because it matches the required event-control report path and gives S03 a stable input, but full candidate CSVs are not required.
