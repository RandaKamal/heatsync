# S03: Baseline vs Smart-Control Comparison, Plots, and CSV Reports

**Goal:** Produce judge-friendly baseline-vs-smart-control CSV reports and validation figures for both heating and cooling validation windows. The slice turns S02 schedules into leakage-safe smart-control time-series, augments per-event results with energy, cost, CO2, and comfort metrics, saves required reports and PNGs under backend/artifacts/event_device_control/, and ends the notebook with a compact executive recap of savings, comfort, paths, and edge cases.
**Demo:** Notebook produces heating and cooling validation plots showing: measured-baseline vs smart-control room temperature with comfort band, event shading with smart-control start times, measured vs simulated total power, per-device on/off schedules, cumulative energy baseline vs smart. Saves per-event and time-series CSV reports plus PNG figures under backend/artifacts/event_device_control/. Reports electricity (kWh), cost (EUR), CO₂ (kg), and comfort metrics (MAE, RMSE, comfort-hit rate, degree-minutes violation).

## Must-Haves

- `backend/notebooks/07_event_based_device_control.ipynb` executes end-to-end after S03 changes and writes all S03 artifacts without exceptions.
- Heating and cooling validation time-series CSVs exist at `backend/artifacts/event_device_control/reports/{heating,cooling}_validation_timeseries.csv` and include at minimum timestamp, event/window identity, event-active flag, smart-control-active flag, baseline room temperature, smart room temperature, comfort band, measured baseline power, simulated smart power, per-device smart schedule flags, interval kWh/cost/CO2, and cumulative baseline vs smart energy.
- Heating and cooling per-event CSVs exist at `backend/artifacts/event_device_control/reports/{heating,cooling}_event_control_results.csv` and preserve the S02 schedule fields while adding baseline/smart kWh, EUR, CO2, savings, comfort MAE/RMSE or equivalent band-error metrics, hit rate, degree-minutes violation, and concise status/reason fields for feasible, infeasible best-effort, comfort-missed, neutral, and negative-savings cases.
- Heating and cooling validation PNGs exist at `backend/artifacts/event_device_control/figures/{heating,cooling}_validation_plot.png`, each showing measured-baseline vs smart-control room temperature with comfort band, event shading and smart starts, measured vs simulated total power, per-device smart schedules, and cumulative energy.
- Smart-control power and energy values are generated from learned device power and thermal model outputs, not future measured `power_draw_kw`; measured power is used only as the baseline comparator.
- Headline summaries include all validation events, including infeasible, comfort-missed, neutral, and negative-savings events; no unfavorable event is filtered out.
- Q3 Threat Surface: outputs are local CSV/PNG artifacts only; no network/API/auth surface is introduced. Main risk is misleading reporting or leakage, covered by tests and explicit status/reason columns.
- Q4 Requirement Impact: no new active requirement ownership is introduced; S03 supports milestone success criteria and carries forward R001's validated aligned-data assumption from S01.
- Q5 Failure Modes: missing schedules, missing model artifacts, infeasible events, NaN temperatures, negative/neutral savings, and plotting path creation failures are handled with transparent errors or visible status fields.
- Q6 Load Profile: validation horizon is the one-week 15-minute grid per season already used by the notebook; helper tests cover small deterministic frames while notebook execution proves the full validation path.
- Q7 Negative Tests: helper tests include infeasible or comfort-miss schedules and verify they remain in reports with non-success status rather than being dropped.

## Proof Level

- This slice proves: Contract plus integration proof. Contract proof comes from focused pytest coverage for leakage-safe time-series/report helpers, status classification, metric columns, and plot/report writer behavior on deterministic small frames. Integration proof comes from executing `07_event_based_device_control.ipynb` through `backend/tests/test_notebooks.py` and verifying that the notebook writes the required reports and figures for both seasons. Full backend quality gates are intentionally left to dependent slice S04, but S03 tasks still compile/test touched backend code before completion.

## Integration Closure

S03 consumes S01 thermal/device-power model artifacts, S02 schedule outputs, and processed heating/cooling datasets, then publishes the exact CSV/PNG artifacts that S04's notebook and quality-gate tests will validate. Existing roadmap ordering remains valid: S03 depends on completed S01/S02 and unblocks S04 without modifying completed slices or adding new downstream slices.

## Verification

- Adds observable local artifacts for judges and downstream tests: detailed time-series CSVs, augmented per-event CSVs with status/reason fields, season validation PNGs, and notebook executive recap tables listing saved paths, savings, comfort hit rates, degree-minute violations, and edge-case counts.

## Tasks

- [x] **T01: Added leakage-safe baseline-vs-smart-control comparison time-series and per-event report augmentation helpers with focused edge-case tests.** `est:1 day`
  ---
  skills_used:
    - design-an-interface
    - tdd
    - verify-before-complete
  ---
  Why: S03 needs reusable, testable comparison contracts before notebook wiring so the final reports do not hide edge cases or leak measured future power into smart-control estimates.
  - Files: `backend/notebooks/utils.py`, `backend/tests/test_event_control_reporting.py`
  - Verify: PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py

- [ ] **T02: Notebook Reports Figures and Executive Recap** `est:1 day`
  ---
  skills_used:
    - write-docs
    - verify-before-complete
  ---
  Why: The capstone evidence must be generated from the notebook itself so judges and S04 tests can reproduce the same baseline-vs-smart-control story end to end.
  - Files: `backend/notebooks/07_event_based_device_control.ipynb`, `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`, `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`, `backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv`, `backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv`, `backend/artifacts/event_device_control/figures/heating_validation_plot.png`, `backend/artifacts/event_device_control/figures/cooling_validation_plot.png`
  - Verify: PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb

- [ ] **T03: Slice-Level Artifact Contract Verification** `est:0.25 day`
  ---
  skills_used:
    - verify-before-complete
  ---
  Why: Before handing off to S04, S03 needs a final executable proof that the helper contracts and notebook-generated artifacts agree with the planned slice outputs.
  - Files: `backend/notebooks/utils.py`, `backend/notebooks/07_event_based_device_control.ipynb`, `backend/tests/test_event_control_reporting.py`
  - Verify: PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py && PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb && PYTHONPATH=. uv run --project backend python -m compileall backend/notebooks backend/tests

## Files Likely Touched

- backend/notebooks/utils.py
- backend/tests/test_event_control_reporting.py
- backend/notebooks/07_event_based_device_control.ipynb
- backend/artifacts/event_device_control/reports/heating_event_control_results.csv
- backend/artifacts/event_device_control/reports/cooling_event_control_results.csv
- backend/artifacts/event_device_control/reports/heating_validation_timeseries.csv
- backend/artifacts/event_device_control/reports/cooling_validation_timeseries.csv
- backend/artifacts/event_device_control/figures/heating_validation_plot.png
- backend/artifacts/event_device_control/figures/cooling_validation_plot.png
