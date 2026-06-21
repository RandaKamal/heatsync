---
estimated_steps: 13
estimated_files: 2
skills_used: []
---

# T02: Implemented learned-power candidate simulation for preconditioning events using learned thermal and device models.

---
skills_used:
  - design-an-interface
  - verify-before-complete
---
Why: The optimizer must evaluate counterfactual preconditioning schedules using learned thermal and device-power models, not future measured power, so feasibility and energy estimates are leakage-free.

Do: Extend `backend/notebooks/utils.py` with candidate generation for configured start offsets and device subsets, 15-minute step simulation from candidate start to event start, use of `predict_device_power` or the learned standby/active device-power parameters for active/standby per-device kW, thermal progression using S01 thermal model dictionaries, and calculation of predicted temperature at event start, comfort violation, expected kWh, expected cost, and expected CO2. Keep measured `power_draw_kw` out of smart-control scoring except as historical state input already available at decision time. Add tests in `backend/tests/test_utils.py` with small synthetic heating and cooling frames/models so expected temperature direction, kWh, cost, CO2, and feasibility can be asserted without depending on large artifacts.

Q3 Threat Surface: Medium for data leakage. Explicitly keep future measured power out of candidate scoring and make tests fail if measured total power is required for counterfactual energy.
Q4 Requirement Impact: Supports the M002 learned-model control requirement; no new active requirement is created.
Q5 Failure Modes: Zero-minute offset, empty device subset, all-devices subset, missing future weather rows, invalid timestep, model fallback dictionaries, and comfort-band boundary equality.
Q6 Load Profile: Roughly 128 candidates per event times one-week validation event counts; vectorization is optional but loops must stay bounded and deterministic.
Q7 Negative Tests: Invalid mode, invalid candidate offset, missing required frame columns, and max-device constraint violations.

Done when: Candidate rows can be simulated for heating and cooling with deterministic numeric outputs and no dependency on future measured power.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`

## Verification

uv run --project backend pytest backend/tests/test_utils.py -k event_candidate

## Observability Impact

Candidate rows include predicted temperature, comfort violation, expected energy/cost/CO2, selected device mask, and candidate start offset for notebook debug display.
