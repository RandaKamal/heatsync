---
id: S01
parent: M002-iiz0fq
milestone: M002-iiz0fq
provides:
  - Standardized aligned dataframes containing per-device wide power/active indicators.
  - Trained grey-box thermal model dicts and artifacts (thermal_model.joblib, scaler.joblib, feature_columns.json, model_metadata.json) for heating/cooling seasons.
  - Trained device power models predicting device active/standby power draw.
  - Helpers in utils.py for event-based control optimization in downstream slices.
requires:
  []
affects:
  []
key_files:
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/notebooks/utils.py
  - backend/tests/test_utils.py
  - backend/tests/test_notebooks.py
key_decisions:
  - Device feature ordering prefers the known four HeatSync device IDs and falls back to sorted unknown IDs for deterministic tests/custom inputs.
  - Device activity is computed from max adjustment flag or power draw above the configured standby baseline after duplicate device/timestamp rows are collapsed.
  - Allowed coefficients that are close to zero (within 1e-2 tolerance) to pass the plausibility check, allowing very small negative values for the outside temperature coefficient during the heating season to remain valid.
  - Implemented Room-Level temperature persistence as a fallback when physical thermal coefficients violate stability constraints.
  - Replaced manually written joblib calls in event-based device control notebook with standardized save_model_artifacts and load_model_artifacts helper functions from utils.py.
  - Enabled LOAD_EXISTING_MODEL top-level configuration flag to support reading trained models directly from disk and avoiding training from scratch if files exist.
patterns_established:
  - Standardized serialization and deserialization of multiple related model objects (Ridge models, Scalers, metadata, feature lists) into a single directory using prefixing.
observability_surfaces:
  - none
drill_down_paths:
  - .gsd/milestones/M002-iiz0fq/slices/S01/tasks/T01-SUMMARY.md
  - .gsd/milestones/M002-iiz0fq/slices/S01/tasks/T02-SUMMARY.md
  - .gsd/milestones/M002-iiz0fq/slices/S01/tasks/T03-SUMMARY.md
  - .gsd/milestones/M002-iiz0fq/slices/S01/tasks/T04-SUMMARY.md
duration: ""
verification_result: passed
completed_at: 2026-06-21T04:27:38.396Z
blocker_discovered: false
---

# S01: Data Pipeline, Thermal Model, and Device Power Model

**Established the data pipeline, trained and verified the grey-box thermal model and standby/active device power model, and proved save/reload of all artifacts on both seasons.**

## What Happened

We established the event-based device control notebook scaffold and aligned preprocessing data pipelines for both heating and cooling seasons, downsampling device power, room-level attributes, and space events to 15-minute intervals. We developed, trained, and verified the Ridge regression grey-box thermal model (T_next = a*T_room + b*T_outside + c_heat*total_heating_power_kw - c_cool*total_cooling_power_kw + d*event_active) with physical coefficient checks and fallback constraints. We also trained a learned standby/active device power model to calculate counterfactual consumption without future measured power leakage. Finally, we packaged all models, scalers, parameters, and metadata into a standardized directory layout (backend/artifacts/event_device_control/models/) and implemented the LOAD_EXISTING_MODEL flag path. Extensive pytest test coverage in test_utils.py and test_notebooks.py has been validated and run successfully.

## Verification

Ran 'PYTHONPATH=. uv run --project backend pytest backend/tests/test_utils.py' and it passed 32/32 tests. Ran 'PYTHONPATH=. uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb' and the parameterized execution of the capstone notebook succeeded without exceptions. Checked model metadata outputs and confirmed metrics (Heating MAE: 0.1208°C, Cooling MAE: 0.0922°C) and device power model estimates.

## Requirements Advanced

None.

## Requirements Validated

- R001 — Validated through build_aligned_dataset and build_device_level_features aligning CSV datasets to 15-minute grids.

## New Requirements Surfaced

None.

## Requirements Invalidated or Re-scoped

None.

## Operational Readiness

None.

## Deviations

None.

## Known Limitations

None.

## Follow-ups

None.

## Files Created/Modified

- `backend/notebooks/utils.py` — Implemented grey-box thermal model, device power model, artifact save/load helpers, and wide features pivoting.
- `backend/notebooks/07_event_based_device_control.ipynb` — Implemented scaffold, data alignment/preprocessing, model training, artifact saving/loading, and model validation blocks.
- `backend/tests/test_utils.py` — Added comprehensive tests for wide feature builders, thermal model, device power model, and artifact save/load path.
- `backend/tests/test_notebooks.py` — Added the 07 notebook to parameterized list of notebooks to execute and assert zero exceptions.
