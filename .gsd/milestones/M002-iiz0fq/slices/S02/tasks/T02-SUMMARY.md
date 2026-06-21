---
id: T02
parent: S02
milestone: M002-iiz0fq
key_files:
  - (none)
key_decisions:
  - (none)
duration: 
verification_result: passed
completed_at: 2026-06-21T06:12:41.367Z
blocker_discovered: false
---

# T02: Implemented learned-power candidate simulation for preconditioning events using learned thermal and device models.

**Implemented learned-power candidate simulation for preconditioning events using learned thermal and device models.**

## What Happened

We implemented candidate simulation for preconditioning schedules in backend/notebooks/utils.py. Specifically:
1. `generate_device_subsets`: Generates all device subsets subject to the maximum simultaneous active devices constraint.
2. `get_historical_value`: Looks up feature values in the historical DataFrame by nearest-neighbor index lookup, preventing missing future weather rows from crashing the simulation.
3. `simulate_preconditioning`: Runs step-by-step 15-minute simulations starting at a candidate offset prior to the event starts_at timestamp. Computes power draw using learned device active/standby parameters, projects thermal progression using the Ridge/fallback thermal model dictionary, and checks comfort band violations.
4. `simulate_all_candidates`: Evaluates all candidates across offsets and device combinations.
Added unit tests in backend/tests/test_utils.py validating all features including negative test assertions. All checks pass cleanly under the uv project.

## Verification

Executed Pytest on the event candidate simulation tests under the backend uv environment.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_utils.py -k event_candidate` | 0 | ✅ pass | 9011ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

None.
