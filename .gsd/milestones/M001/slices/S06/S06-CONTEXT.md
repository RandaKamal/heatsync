---
id: S06
milestone: M001
status: ready
---

# S06: Energy Controls and Savings Optimization — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create an energy-controls notebook that uses S01 aligned data and S04 physical-model behavior to compare setback scenarios, show occupancy heat-gain assumptions, enforce comfort guardrails, and estimate HVAC kWh savings.

## Why this Slice

This slice follows S01 and S04 because controls and savings estimates need both a trustworthy aligned data foundation and a calibrated physical-model proof before scenario results can be interpreted responsibly. It turns the physical-modeling work into a practical controls demonstration while keeping the outputs framed as transparent notebook estimates rather than production control recommendations.

## Scope

### In Scope

- Build `06_energy_controls.ipynb` as a runnable, reader-friendly controls and savings scenario notebook using S01 aligned data and S04 physical-model behavior.
- Compare a fixed comfort baseline against 2-3 named setback strategies so readers can understand comfort and energy tradeoffs quickly.
- Use a simple, clearly stated occupied/unoccupied schedule and occupancy heat-gain assumption rather than pretending to infer occupancy when direct evidence is unavailable.
- Define explicit comfort guardrails for occupied periods and show whether each scenario violates, approaches, or satisfies those bounds.
- Simulate or estimate thermal response under baseline and setback schedules using the best available S04-calibrated physical-model behavior or clearly documented simplified behavior derived from it.
- Estimate HVAC kWh savings for each scenario and present those savings as approximate scenario estimates with assumptions and caveats beside the output.
- Show a concise scenario table with estimated kWh, estimated savings, comfort status, and key assumptions.
- Show plots that make setpoint schedules, simulated/estimated temperature response, comfort bounds, and savings tradeoffs visible to a human reader.
- Explain model limits, occupancy assumptions, comfort assumptions, and data limitations honestly.

### Out of Scope

- Reimplementing S01 preprocessing, timestamp alignment, or data-quality handling inside the controls notebook.
- Recalibrating the 2R2C model or redoing PINN training; physical-model proof belongs to S04.
- Claiming utility-grade, guaranteed, or production-validated energy savings.
- Live actuator commands, heat-pump control integration, building automation interfaces, or deployment logic.
- Producing a production control policy artifact, model registry entry, or persistent control schedule for operational use.
- Broad optimization or grid search over many setpoint combinations unless it remains a small illustrative notebook calculation.
- Anomaly detection, alarm forensics, or fault handling; those belong to S05.
- Full notebook-suite execution tests; those belong to S07.

## Constraints

- S06 depends on S01 and S04 and should consume their aligned data, shared helpers, and calibrated physical-model outputs or assumptions rather than duplicating their work.
- Shared helper imports should come from `backend/notebooks/utils.py` per decision D001.
- The notebook must run end-to-end programmatically with zero exceptions as part of the milestone’s notebook-suite goal.
- The milestone requires control setback scenarios to estimate HVAC kWh energy savings, so the notebook must visibly produce savings estimates.
- Comfort guardrails must be visible alongside savings so high-savings but uncomfortable scenarios are not presented as acceptable by default.
- Occupancy heat gains must be transparent assumptions unless direct occupancy data exists and is clearly documented.
- Savings estimates should remain approximate and caveated, especially when model calibration quality, heat-input proxies, or power data are limited.
- The notebook should prioritize understandable scenario comparison over production-grade optimization.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared loading, aligned-data access, generic feature, and data-quality helpers used to prepare controls inputs without redoing preprocessing.
- `backend/notebooks/01_preprocessing.ipynb` — Predecessor notebook documenting the normalized 15-minute data foundation, coverage, gap handling, and available power or operating-state signals.
- `backend/notebooks/04_physical_modeling.ipynb` — Physical-modeling predecessor that provides calibrated 2R2C parameters, model assumptions, and interpretation used to ground scenario response estimates.
- `backend/data/processed/` or the repository’s selected S01 processed-data artifact location — Deterministic 15-minute aligned dataframe used for baseline conditions, power signals, and scenario setup.

### Produces

- `backend/notebooks/06_energy_controls.ipynb` — Runnable controls notebook showing baseline and setback scenarios, occupancy heat-gain assumptions, comfort guardrails, estimated thermal response, estimated HVAC kWh savings, plots, and caveats.
- Notebook output scenario table — Human-readable and automation-friendly evidence of baseline kWh, scenario kWh, estimated savings, comfort status, and key assumptions.
- Comfort and setpoint plots — Visual proof of occupied comfort bounds, setback periods, and response behavior.
- Savings interpretation notes — Reader-facing explanation of what the estimates mean and what they do not prove.

## Open Questions

- What exact comfort temperature bounds should be used? — Current thinking: choose simple occupied comfort bounds during implementation and state them clearly in the notebook, with any violations marked in the scenario table.
- What exact occupancy schedule and heat-gain magnitude should be used? — Current thinking: use a simple transparent schedule and heat-gain assumption unless direct occupancy data exists, and label the assumption as illustrative.
- What exact baseline and setback schedules should be compared? — Current thinking: include one fixed comfort baseline plus 2-3 named strategies such as mild setback, deeper setback, and possibly a recovery/preconditioning variant.
- How should HVAC kWh savings be calculated from available data and model behavior? — Current thinking: tie estimates to available S01 power data and S04-calibrated response where possible, but keep formulas transparent and caveated as approximate scenario estimates.
- Should small simulation or savings helpers be moved into `utils.py`? — Current thinking: keep S06 logic notebook-local unless the same function is clearly reused from S04 or needed for clean verification.
