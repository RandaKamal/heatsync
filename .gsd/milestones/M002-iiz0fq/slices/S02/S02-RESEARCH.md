# S02 Research: Event-Based Optimizer and Control Schedule

## Context and Findings

This research targets S02: Event-Based Optimizer and Control Schedule, which focuses on building the predictive controller optimization logic and schedule outputs.

### 1. Requirements and Core Decisions
- **Feasibility Priority:** Choose the cheapest candidate schedule (based on predicted power and season-specific cost/CO₂) that meets the comfort target. If no schedule meets the target, choose the one with the smallest comfort violation.
- **Feasible Target Range:** Comfort targets are bounded seasonal bands.
  - Heating: target comfort range is $[20, 24]^\circ\text{C}$. The target temperature is $20^\circ\text{C}$ (lower comfort boundary).
  - Cooling: target comfort range is $[20, 24]^\circ\text{C}$. The target temperature is $24^\circ\text{C}$ (upper comfort boundary).
- **Candidate Options:**
  - Start offsets: $\{0, 15, 30, 45, 60, 90, 120, 180\}$ minutes before event start.
  - Device subsets: All combinations of $2^4 = 16$ subsets of the 4 heat pump devices.
  - Total combinations per event: $8 \times 16 = 128$ candidates.
- **Device Power Model:** Use learned/predicted standby vs active power (learned parameters from S01) inside the counterfactual optimization loop, preventing data leakage from measured power.
- **Constraints:**
  - Max simultaneous active devices: Configurable (default 4).
  - Min on/off duration: Control decisions are made at 15-minute resolution, satisfying implicit min runtime.
- **Overlapping/Close Events Consolidation:**
  - In our validation data, heating season events overlap completely since "Event 8", "Event 9", "Event 10", "Event 11", "Event 12", "Event 13" represent full day intervals (e.g. 04:30 to 21:30) that duplicate each other.
  - Cooling season events are distinct meetings on each day (Event 1-5 on 2026-05-27, Event 6-12 on 2026-05-28, Event 13-15 on 2026-05-29).
  - A robust event identification and consolidation utility is needed to resolve overlap and generate a clean sequence of optimization targets.

### 2. Physical Evolution Simulator Details
Using the Grey-Box model coefficients:
$$T_{t+1} = a T_t + b T_{out, t} + c_{mode} P_{total, t} + d \cdot \text{event\_active}_t + \text{intercept}$$
where:
- $P_{total, t} = \sum_{i=1}^4 P_{device\_i, t}$
- $P_{device\_i, t}$ is predicted active or standby power depending on the candidate action subset.
- For heating mode, $c_{mode} = c_{heat}$. For cooling mode, $c_{mode} = c_{cool}$.

The simulator projects room temperature step-by-step from the start of preconditioning ($t_{start} = t_{event\_start} - \text{offset}$) until the event start time ($t_{event\_start}$). At $t_{event\_start}$, the predicted room temperature is checked against the comfort target boundary.

## Recommendation

Implement a clean, structured set of utilities in `backend/notebooks/utils.py` and invoke them inside `backend/notebooks/07_event_based_device_control.ipynb`:
1. **Event Consolidation Helper:** Identifies unique events, merges duplicate/overlapping windows, and retains a clean collection of events.
2. **Schedule Candidate Simulator:** For a single event and initial room temperature, simulates each of the 128 candidate actions and calculates:
   - Predicted temperature at event start.
   - Total energy consumption (kWh) over the preconditioning window.
   - Financial cost (EUR) and CO₂ emissions (kg).
   - Feasibility status and comfort violation ($^\circ\text{C}$ degree-minutes or absolute deviation).
3. **Schedule Optimizer & Selector:** Loops through consolidated events, runs the simulator, evaluates feasibility, applies constraints, and selects the optimal candidate. Emits a DataFrame with the columns:
   - `event_id`, `mode`, `start_time`, `device_1_on`, `device_2_on`, `device_3_on`, `device_4_on`, `target_temp`, `predicted_temp_at_start`, `expected_kwh`, `expected_cost`, `expected_co2`.
4. **Validation Test Case:** Write robust pytest checks in `backend/tests/test_utils.py` for event consolidation, simulation, and schedule optimization.

## Implementation Landscape

### Existing Files & Utilities
- `backend/notebooks/utils.py` already includes preprocessing loaders and the Ridge thermal regression training/prediction logic.
- We will add the simulation and optimization logic to `utils.py`.
- The notebook `backend/notebooks/07_event_based_device_control.ipynb` will be updated to execute this logic on both heating and cooling validation seasons and output the resulting schedule tables.

### Execution Target
- Run tests via `PYTHONPATH=backend/notebooks uv run --project backend pytest backend/tests/test_utils.py`
- Validate notebook end-to-end execution via `PYTHONPATH=backend/notebooks uv run --project backend pytest backend/tests/test_notebooks.py -k 07_event_based_device_control.ipynb`
