# M002-iiz0fq: Event-Based Device-Level Heat Pump Control

**Gathered:** 2026-06-20
**Status:** Ready for planning

## Project Description

Build the final capstone control notebook, `backend/notebooks/07_event_based_device_control.ipynb`, that decides — given a future event (lecture/meeting) start time — **which** of the four heat pump devices to activate and **when** to start pre-heating or pre-cooling, so the room reaches a comfortable temperature by event start. The controller acts at the **device level** (four heat pumps, separately) but performance is judged at the **room level** (shared room temperature, total electricity, total cost, total CO₂). The notebook simulates alternative control decisions and compares the proposed smart-control behavior against the current measured baseline on time-based validation data, for both heating and cooling seasons.

Driven by the explicit task specification in `event_based_device_control_task.md`. M001 (the modeling/controls notebook suite) is complete; this milestone is the capstone that turns the proven physical/grey-box modeling into an event-aware, device-level predictive controller with quantified savings.

## Why This Milestone

The challenge brief asks the headline question directly: *when should each heat pump switch on so the hall reaches the right temperature when a lecture starts, and how much electricity, money, and CO₂ does that save versus current behavior?* `06_energy_controls.ipynb` is only a simple earlier control prototype; it does not do event-aware, device-level start-timing or a leakage-safe counterfactual comparison. This milestone exists to prove the claim that the room can be pre-conditioned **only when needed**, choosing which pumps to run, predicting whether comfort will be reached by event start, and showing the savings in a way judges can understand.

## User-Visible Outcome

### When this milestone is complete, the user can:

- Open and run `backend/notebooks/07_event_based_device_control.ipynb` top-to-bottom with zero exceptions, on both the heating and cooling seasonal datasets, and see, per validation event, an explicit control-action schedule: `event_id, mode, start_time, device_1_on, device_2_on, device_3_on, device_4_on, target_temp, predicted_temp_at_start, expected_kwh, expected_cost, expected_co2`.
- Read heating and cooling validation plots showing measured-baseline vs smart-control room temperature with the comfort band, event shading, selected smart-control start times, measured vs simulated total power, per-device on/off schedules for Device 1–4, and cumulative energy baseline vs smart control.
- Inspect saved per-event and time-series CSV reports plus reusable saved model weights / preprocessing artifacts, and re-run the notebook with `LOAD_EXISTING_MODEL = True` to reload trained weights without retraining.

### Entry point / environment

- Entry point: `backend/notebooks/07_event_based_device_control.ipynb` (executed via Jupyter or programmatically, as in M001's `test_notebooks.py`).
- Environment: local dev; `uv run --project backend`; CI runs the same backend gates.
- Live dependencies involved: none — all local CSVs under `backend/data/`. Libraries: pandas/numpy, scikit-learn, PyTorch, joblib, matplotlib.

## Completion Class

- **Contract complete means:** the notebook executes end-to-end on both seasons with zero exceptions; the simple interpretable grey-box thermal model trains, saves, and reloads weights/scaler/feature-columns/metadata; per-event and time-series CSVs and heating/cooling figures are written to `backend/artifacts/event_device_control/...`; reusable controller/thermal/power-model helpers exist (extending `backend/notebooks/utils.py`) with a pytest test that runs the notebook end-to-end; backend lint/type/security/pytest/pre-commit gates pass.
- **Integration complete means:** the controller consumes both seasonal datasets via the existing `backend/data/loader.py` + `utils.py` (adapted to the real season-subfolder layout), produces device-level decisions evaluated at room level, and the counterfactual simulation uses a **learned/predicted** device power model — never future measured power — so the baseline-vs-smart comparison is leakage-free.
- **Operational complete means:** none beyond the above — this is an offline analysis/demo notebook, not a deployed service.

## Final Integrated Acceptance

To call this milestone complete, we must prove:

- For both heating and cooling validation events, the notebook produces an explicit device-level control schedule, predicts room temperature at event start, and reports baseline vs smart-control electricity (kWh), cost (EUR), CO₂ (kg), and comfort metrics — with the smart path driven only by learned models and the actual initial state, not by copied future measured power.
- The trained model and preprocessing artifacts can be saved and then **reloaded** in a fresh run without retraining (hard requirement — the notebook is not complete if it trains but cannot reload).
- The savings story is visually obvious in the heating and cooling validation plots: the controller pre-conditions only around events and avoids unnecessary operation outside event periods.
- What cannot be simulated away: real end-to-end execution on the actual on-disk CSVs for both seasons, with the leakage-safe counterfactual — a passing run is the proof.

## Architectural Decisions

### Grey-box thermal model is the definition of done; black-box is benchmark/residual stretch

**Decision:** The simple interpretable shared-coefficient grey-box thermal model — `T_next = a*T_room + b*T_outside + c_heat*total_heating_power_kw - c_cool*total_cooling_power_kw + d*event_active`, fit separately for heating and cooling — is the definition of done. Per-device thermal coefficients and any black-box (LSTM/MLP/XGBoost/RF) residual-correction or benchmark model are stretch goals only.

**Rationale:** Interpretability matters for the demo/judges, and a hackathon-safe interpretable controller is more reliable than an opaque one. The control logic must remain `physical/grey-box thermal model + device-level electricity model + event-based optimizer`. A pure black-box model must never be the main controller.

**Alternatives Considered:**
- Per-device thermal coefficients as the primary model — rejected as primary because coefficients may be unstable/implausible; allowed only as a stretch variant when stable.
- Black-box model as main controller — rejected; the task forbids it and interpretability is required.

### Fallback rule for unstable per-device thermal effects

**Decision:** If per-device thermal coefficients are not stable and physically plausible, use a **room-level** thermal model for temperature evolution, and still use **device-level** power/electricity models for energy, cost, and CO₂.

**Rationale:** Preserves interpretability and demo reliability while keeping the device-level control/energy story intact even when per-device thermal identification fails.

**Alternatives Considered:**
- Forcing per-device thermal coefficients regardless of stability — rejected; risks physically implausible predictions and a fragile demo.

### Learned/predicted device power model (no future-power leakage)

**Decision:** Device power draw is **not known at decision time**, so the controller learns/predicts each device's power from available state/control features (standby vs active power per device per mode), and uses that **predicted** power inside the counterfactual simulation. The real `power_draw_kw` is used only for training/evaluation and as the measured baseline — never as a future input to the smart-control path.

**Rationale:** `power_draw.csv` is per-device 5-minute electrical power; temperature/status come from snapshots / 15-minute intervals. Using future measured power inside the controller would leak validation data and invalidate the savings comparison.

**Alternatives Considered:**
- Using measured future power in the counterfactual — rejected as data leakage.

### Reuse existing loaders; artifacts under `backend/`

**Decision:** Reuse `backend/data/loader.py` and `backend/notebooks/utils.py` (extending them as needed), adapted to the real on-disk **season-subfolder** layout, rather than re-loading raw flat CSVs from scratch. Save all artifacts under `backend/artifacts/event_device_control/...` (models/, figures/, reports/) to keep everything inside the backend project.

**Rationale:** Consistency with M001 (D001 centralizes notebook utilities in `utils.py`), less duplication, and keeping generated outputs within the backend `uv` project.

**Alternatives Considered:**
- Re-implementing loading inline in the notebook with the flat filenames from the task spec — rejected; the on-disk layout differs and existing loaders already handle alignment/interpolation.
- Repo-root `artifacts/` directory (as literally written in the task file) — relocated under `backend/artifacts/` to stay inside the backend project.

> See `.gsd/DECISIONS.md` for the full append-only register of all project decisions.

## Error Handling Strategy

The notebook must fail loudly and early on data issues (missing season files, empty events, devices that never leave standby) rather than silently producing misleading savings. Activity detection uses a configurable threshold (`was_adjusting_temperature == 1` OR power clearly above standby baseline); thresholds and comfort/energy constants are surfaced as visible config dicts at the top of the notebook. The controller selection rule degrades gracefully: choose the lowest-energy schedule that satisfies comfort; if no schedule satisfies comfort, choose the smallest comfort violation and **report it clearly** rather than hiding the failure. Reload path must verify all required artifact files exist before loading; otherwise it retrains and re-saves.

## Risks and Unknowns

- Per-device thermal coefficients may be unstable/implausible — mitigated by the room-level thermal fallback while keeping device-level energy models.
- Leakage in the counterfactual simulation — mitigated by the learned device power model; measured future power is forbidden as a smart-control input.
- Data-layout mismatch — the task file assumes flat filenames (`1_heat_pump_intervals.csv`, `heat_pump_intervals.csv`, etc.), but on disk data lives in season subfolders `backend/data/heating_2026-03-30_to_2026-04-05/` and `backend/data/cooling_2026-05-25_to_2026-05-31/`. Reconcile during planning.
- File naming: each seasonal directory contains **both** `heat_pump_snapshots.csv` and `heat_pump_intervals.csv` — the snapshot file is **not** a replacement for the interval file; both exist alongside `space_events.csv` and `power_draw.csv`. Interval data is the 15-minute grid; snapshots are a separate source. Do not conflate them.
- Comfort feasibility on sparse/short validation windows — some events may have no feasible schedule; the report must say so.

## Existing Codebase / Prior Art

- `backend/notebooks/06_energy_controls.ipynb` — simpler/earlier control prototype; kept as supporting work, not replaced.
- `backend/notebooks/04_physical_modeling.ipynb` — physical/hybrid (2R2C grey-box, PINN) model development; thermal-modeling reference.
- `backend/notebooks/utils.py` — shared loading / 15-min alignment / interpolation / feature engineering helpers (D001); extend here for controller/thermal/power-model logic.
- `backend/data/loader.py` — existing data loader to reuse/adapt to season subfolders.
- `backend/data/{heating_2026-03-30_to_2026-04-05,cooling_2026-05-25_to_2026-05-31}/` — each holds `heat_pump_intervals.csv`, `heat_pump_snapshots.csv`, `power_draw.csv`, `space_events.csv`; plus `backend/data/devices.csv` and `backend/data/processed/`.
- `backend/tests/test_notebooks.py` — M001 pattern of executing notebooks end-to-end; mirror for `07_...`.

## Relevant Requirements

- See `.gsd/REQUIREMENTS.md` — this milestone advances the occupancy/event-based control-optimization capability by delivering an event-aware, device-level predictive controller with quantified kWh/cost/CO₂ savings. New requirements to be registered during planning.

## Scope

### In Scope

- `backend/notebooks/07_event_based_device_control.ipynb` running end-to-end on both heating and cooling seasons.
- Preprocessing to a common 15-minute grid: device-level power aggregated from 5-minute `power_draw.csv` (mean kW per bucket; energy = mean_power_kw * 0.25); room-level variables as median (temperature/return-temp/humidity/CO₂) and sum (power/energy) across the four devices.
- Device-level features and wide `device_i_active` / `device_i_power_kw` columns; configurable activity threshold.
- Event features (`event_active`, `minutes_to_next_event`, `minutes_since_previous_event`, `next_event_start/end`, `inside_preconditioning_window`) from `space_events.csv` treated as room-level.
- Simple interpretable grey-box thermal model (separate heating/cooling), with save **and** reload of weights/scaler/feature-columns/metadata (hard requirement).
- Learned per-device electricity model (standby / active heating / active cooling power) used in the leakage-safe counterfactual.
- Event-based optimizer: candidate start times {0,15,30,45,60,90,120,180} min before event × 16 device subsets; "cheapest feasible, else smallest comfort violation (reported)" rule; configurable comfort/control/energy config dicts; device switching constraints (min on/off time, max simultaneous devices).
- Explicit control-action schedule output per event: `event_id, mode, start_time, device_1_on, device_2_on, device_3_on, device_4_on, target_temp, predicted_temp_at_start, expected_kwh, expected_cost, expected_co2`.
- Baseline (measured) vs smart-control comparison; per-event + time-series CSV reports; heating/cooling validation plots.
- Temperature metrics (MAE, RMSE, comfort-hit rate) and control metrics (baseline/smart/saved kWh, %, cost, CO₂, comfort violation degree-minutes, events reaching comfort at start).
- Reusable helpers in `utils.py` + a pytest test executing the notebook end-to-end; passing backend lint/type/security/pytest/pre-commit gates (full M001 rigor).
- Artifacts under `backend/artifacts/event_device_control/{models,figures,reports}/`.

### Out of Scope / Non-Goals

- Replacing or deleting `06_energy_controls.ipynb` or other prior notebooks (they remain as supporting work).
- A pure black-box model as the main controller.
- Real-time / deployed / online control, API endpoints, or frontend integration.
- Multi-room or multi-zone control — single shared room only.
- Re-deriving M001 models beyond what this controller needs.

## Technical Constraints

- Time-based validation splits only — no random shuffling. Report exact train vs validation timestamps. (Heating: train earlier part of 2026-03-30→04-05, validate later event periods; Cooling: train earlier part of 2026-05-25→05-31, validate later events ~2026-05-27→05-29.)
- Do not sum temperature/humidity/CO₂ across devices — only sum power and energy.
- Counterfactual must use learned device power, the actual initial room temperature, and actual/historical outside temperature — never copied future measured power.
- Backend-project discipline: `uv run --project backend ...`; if helpers must import via package metadata, expose the package in `backend/pyproject.toml` (pytest `pythonpath` alone is insufficient for the explicit import gate).
- Timestamps normalized consistently (UTC-aware or consistently UTC-naive).
- Config constants (`comfort_config`, `control_config`, `energy_config` with `electricity_price_eur_per_kWh: 0.35`, `co2_kg_per_kWh: 0.40`) visible at the top of the notebook.

## Integration Points

- `backend/data/loader.py` + `backend/notebooks/utils.py` — data loading, 15-min alignment, feature engineering (adapted to season subfolders).
- `backend/data/` CSVs (both seasons + `devices.csv`) — sole data source.
- `backend/artifacts/event_device_control/` — generated models, figures, reports.
- `backend/tests/` + pre-commit/CI — verification harness mirroring M001.

## Testing Requirements

- A pytest test under `backend/tests/` executes `07_event_based_device_control.ipynb` end-to-end with zero exceptions (mirroring `test_notebooks.py`).
- Verify required artifact files are written: `thermal_model.joblib`, `scaler.joblib`, `feature_columns.json`, `model_metadata.json` (and `residual_model.pt` if the PyTorch residual stretch is used), plus heating/cooling event-control CSVs, validation time-series CSVs, and the two PNG figures.
- Verify the reload path: with `LOAD_EXISTING_MODEL = True` and artifacts present, the notebook loads weights without retraining.
- Leakage check: confirm the smart-control path does not consume future measured `power_draw_kw`.
- Backend gates pass: `uv sync --project backend --frozen --dev`, ruff check + format, mypy, bandit, `uv audit`, `py_compile`, pytest, and `pre-commit run --all-files`.

## Acceptance Criteria

Carried verbatim from `event_based_device_control_task.md`, plus the three tightenings confirmed by the user:

- Uses **both** heating and cooling datasets.
- Controls **four devices separately**; final evaluation is **room-level**.
- Trains a **reusable** model and **saves** weights + preprocessing artifacts; can **reload** without retraining.
- Creates heating and cooling validation plots with event timings.
- Compares measured baseline behavior vs smart-control behavior (leakage-free).
- Reports electricity, cost, CO₂, and comfort metrics.
- Saves event-level and time-series validation CSV files.
- **(Tightening 1)** Outputs an explicit control-action schedule per event: `event_id, mode, start_time, device_1_on, device_2_on, device_3_on, device_4_on, target_temp, predicted_temp_at_start, expected_kwh, expected_cost, expected_co2`.
- **(Tightening 2)** Uses a **learned/predicted** device power model inside the counterfactual; real `power_draw_kw` only for training/evaluation/baseline.
- **(Tightening 3)** Applies the fallback: if per-device thermal coefficients are implausible, use a room-level thermal model for temperature evolution and device-level models for energy/cost/CO₂.

## Open Questions

- Exact stability test for accepting per-device thermal coefficients — current thinking: sign/physical-plausibility + cross-window consistency; default to room-level fallback if in doubt. Resolve during planning.
- Whether the PyTorch residual-correction stretch (`residual_model.pt`) is attempted at all this milestone — current thinking: grey-box DoD first; add only if time and stability allow.
- Final reconciliation of task-file flat filenames vs on-disk season-subfolder layout and the snapshot/interval distinction — to be settled in the first planning slice.
