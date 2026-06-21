---
id: S03
milestone: M002-iiz0fq
status: ready
---

# S03: Baseline vs Smart-Control Comparison, Plots, and CSV Reports — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Produce judge-friendly baseline-vs-smart-control CSV reports and validation figures for heating and cooling, making electricity, cost, and CO₂ savings obvious while preserving comfort and edge-case transparency.

## Why this Slice

S03 turns the S01 model outputs and S02 event-control schedules into the capstone evidence package: saved CSVs, saved PNGs, and notebook recap outputs that prove whether smart control preconditions only around events and improves energy, cost, CO₂, and comfort outcomes. It is done after S01/S02 because it depends on trained/reloadable thermal and device power models plus per-event optimizer decisions, and it unblocks S04 by creating the artifacts and user-facing outputs that tests and quality gates must verify.

## Scope

### In Scope

- Lead the comparison story with electricity, cost, and CO₂ savings, while keeping comfort metrics visible as guardrails.
- Produce one single-narrative stacked validation PNG per season showing measured-baseline vs smart-control room temperature with comfort band and event shading, measured vs simulated total power, per-device on/off schedules, and cumulative energy baseline vs smart.
- Save judge-friendly per-event CSV reports for heating and cooling with required kWh, EUR, CO₂, and comfort metrics plus concise decision/status fields.
- Save heating and cooling validation time-series CSVs that support the plots and allow downstream checks of baseline vs smart trajectories.
- Keep infeasible events, comfort misses, and low or negative-savings events visible in plots and reports rather than filtering them out.
- Include concise per-event status/reason fields so non-technical readers can distinguish feasible schedules, best-effort infeasible schedules, comfort misses, and negative/neutral savings.
- Finish the notebook section with an executive recap: compact heating/cooling summary tables, comfort hit-rate and degree-minute summary, saved artifact paths, and a short note when edge cases occurred.

### Out of Scope

- Hiding failed, infeasible, or unfavorable validation events from headline reports.
- Building an interactive dashboard, frontend, deployed service, or API.
- Replacing or deleting prior notebooks such as `06_energy_controls.ipynb`.
- Reworking S01 thermal/power model training or S02 optimizer selection logic except where necessary to consume their outputs for reporting.
- Producing extra figures beyond the required validation PNGs unless the single-narrative figure becomes too crowded to read.
- Expanding into multi-room or multi-zone analysis.

## Constraints

- Smart-control comparison must remain leakage-safe: simulated smart energy and power values use the learned/predicted device power model, never future measured `power_draw_kw`.
- Headline savings and comfort summaries must include all validation events, including infeasible, missed-comfort, neutral, and negative-savings cases, so the report does not overstate performance.
- The saved PNGs and notebook recap should be understandable by judges without requiring code inspection.
- Reports and figures must be written under `backend/artifacts/event_device_control/{reports,figures}/`.
- Baseline is measured behavior; smart control is the counterfactual schedule-driven simulation from the learned models and actual initial state.
- Temperature, comfort, power, energy, cost, and CO₂ metrics must be reported for both heating and cooling validation windows.

## Integration Points

### Consumes

- `backend/notebooks/07_event_based_device_control.ipynb` — notebook entry point where the S03 comparison, artifact writing, and executive recap are presented.
- `backend/notebooks/utils.py` — shared helpers from S01 and any S02 utilities used to build comparison frames, metrics, and plots.
- `backend/artifacts/event_device_control/models/` — trained/reloaded thermal and device power artifacts supporting leakage-safe simulation.
- S02 control schedule output — per-event selected smart-control start times, device masks, target temperature, predicted event-start temperature, expected kWh/cost/CO₂, and feasibility information.
- `backend/data/processed/{heating,cooling}_processed.csv` — validation time-series inputs for measured baseline and event context.

### Produces

- `backend/artifacts/event_device_control/figures/heating_validation_plot.png` — single-narrative heating validation comparison figure.
- `backend/artifacts/event_device_control/figures/cooling_validation_plot.png` — single-narrative cooling validation comparison figure.
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv` — heating per-event report with required metrics plus decision/status fields.
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv` — cooling per-event report with required metrics plus decision/status fields.
- `backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv` — heating validation time-series report used by plots and audit checks.
- `backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv` — cooling validation time-series report used by plots and audit checks.
- Notebook executive recap output — compact season-level savings/comfort summaries and artifact paths for demo handoff.

## Open Questions

- Whether optional extra detail figures should be produced if the required single-narrative PNG becomes crowded — current thinking: avoid extras unless readability suffers.
- Exact names and allowed values for status columns — current thinking: include concise values such as `feasible`, `infeasible_best_effort`, `comfort_missed`, `saved_energy`, `neutral`, and `negative_savings`.
