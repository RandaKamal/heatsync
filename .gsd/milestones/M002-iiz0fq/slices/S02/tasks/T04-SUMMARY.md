---
id: T04
parent: S02
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/artifacts/event_device_control/reports/heating_event_control_results.csv
  - backend/artifacts/event_device_control/reports/cooling_event_control_results.csv
key_decisions:
  - Kept report persistence behind `save_event_control_schedule_report` so notebook output remains scoped to the owned backend artifact report directory.
  - Bound the notebook optimizer demo to one validation week per season using the existing split timestamps to keep smoke execution bounded while producing judge-readable schedules.
duration: 
verification_result: passed
completed_at: 2026-06-21T07:30:12.502Z
blocker_discovered: false
---

# T04: Wired the S02 event-control optimizer into notebook 07 and persisted heating and cooling selected schedule CSV reports.

**Wired the S02 event-control optimizer into notebook 07 and persisted heating and cooling selected schedule CSV reports.**

## What Happened

Updated `backend/notebooks/07_event_based_device_control.ipynb` to import `EventControlConfig`, `optimize_event_control_schedules`, and `save_event_control_schedule_report` from the existing optimizer helper surface. Expanded the visible `comfort_config`, `control_config`, and `energy_config` cells with S02 defaults for comfort bands, candidate offsets, device limits, top-candidate diagnostics, merge threshold, and one-week validation horizon.

Added notebook cells that align validation events to the existing S01 split timestamps, bound optimizer input frames to one validation week per season, run the optimizer for heating and cooling using the loaded or freshly trained thermal and device-power artifacts, display selected schedules, display compact top-candidate diagnostics, summarize feasibility by selection reason, and persist selected schedules via the owned report helper.

## Failure Modes
- Model artifact dependency: the existing `LOAD_EXISTING_MODEL=True` path still gates on the complete model artifact set and falls back to notebook training when artifacts are absent; `load_model_artifacts` bubbles explicit `FileNotFoundError` for missing thermal, scaler, metadata, or device-power files.
- Data dependency: notebook cells use existing `load_processed` and `load_space_events` helpers; missing or malformed local CSV inputs bubble through those helpers and notebook execution fails visibly.
- Empty validation events: the added optimizer cell explicitly raises `ValueError` if either one-week validation event slice is empty, preventing silent empty reports.
- Report filesystem dependency: report writes are routed through `save_event_control_schedule_report`, which validates required output columns, restricts report names to filenames, creates the owned report directory, and writes only under `backend/artifacts/event_device_control/reports`.

## Load Profile
- Expected load is bounded to the first validation week for each season and to configured candidate offsets `0..120` minutes at 15-minute increments with up to four simultaneous devices. The first saturating resource at 10x load would be candidate simulation count across consolidated event windows and device subsets.
- Protection applied in the notebook: validation frames and event slices are explicitly bounded by `validation_horizon_days=7`, diagnostics are compacted with `top_candidate_count=5`, and full candidate CSV persistence is avoided. Candidate/device bounds are validated by the optimizer helper.

## Negative Tests
- Existing utility tests from prior S02 tasks cover optimizer validation, malformed candidate offsets, invalid device counts, empty/no-window behavior, report path scoping, and required schedule columns in `backend/tests/test_utils.py`.
- This task additionally verified the real notebook path with `backend/tests/test_notebooks.py -k event_based_device_control`, which executes the notebook end to end and fails on missing models, empty validation events, invalid optimizer outputs, or report persistence errors.
- A follow-up schema check asserted both persisted CSVs exist, are non-empty, and include every downstream S02 schedule column.

## Verification

Ran the required notebook execution smoke test with `uv run --project backend pytest backend/tests/test_notebooks.py -k event_based_device_control -q`; it passed. Then ran a direct backend Python schema check over `backend/artifacts/event_device_control/reports/heating_event_control_results.csv` and `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`; both files exist, are non-empty, and contain the required S02 schedule columns. The generated heating report contains 6 rows and the cooling report contains 10 rows; current selected schedules are transparently marked infeasible, matching the slice requirement to report infeasible events rather than raise.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_notebooks.py -k event_based_device_control -q` | 0 | ✅ pass | 22225ms |
| 2 | `uv run --project backend python - <<'PY'
from pathlib import Path
import pandas as pd
required = [
    'event_id', 'mode', 'start_time', 'device_1_on', 'device_2_on',
    'device_3_on', 'device_4_on', 'target_temp', 'predicted_temp_at_start',
    'expected_kwh', 'expected_cost', 'expected_co2', 'feasible',
    'selection_reason', 'comfort_violation_c', 'candidate_start_offset_minutes',
    'active_device_count',
]
for season in ['heating', 'cooling']:
    path = Path(f'backend/artifacts/event_device_control/reports/{season}_event_control_results.csv')
    if not path.exists():
        raise SystemExit(f'MISSING {path}')
    df = pd.read_csv(path)
    missing = [col for col in required if col not in df.columns]
    if missing:
        raise SystemExit(f'{path} missing columns: {missing}')
    if df.empty:
        raise SystemExit(f'{path} is empty')
    print(f'{season}: rows={len(df)} feasible={int(df["feasible"].sum())} infeasible={int((~df["feasible"].astype(bool)).sum())} columns_ok=true path={path}')
PY` | 0 | ✅ pass | 505ms |

## Deviations

None.

## Known Issues

The current one-week validation run selects no feasible schedules for either season (heating: 0/6 feasible, cooling: 0/10 feasible). This is surfaced in the schedule rows and feasibility summaries as required rather than treated as a notebook failure.

## Files Created/Modified

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`
