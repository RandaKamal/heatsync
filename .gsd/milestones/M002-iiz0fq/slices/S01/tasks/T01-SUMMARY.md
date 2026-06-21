---
id: T01
parent: S01
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/07_event_based_device_control.ipynb
  - backend/notebooks/utils.py
  - backend/tests/test_utils.py
key_decisions:
  - Device feature ordering prefers the known four HeatSync device IDs and falls back to sorted unknown IDs for deterministic tests/custom inputs.
  - Device activity is computed from max adjustment flag or power draw above the configured standby baseline after duplicate device/timestamp rows are collapsed.
duration: 
verification_result: passed
completed_at: 2026-06-20T22:23:23.968Z
blocker_discovered: false
---

# T01: Established and verified the event-based device-control notebook scaffold plus reusable device, room, and event feature builders for both seasonal datasets.

**Established and verified the event-based device-control notebook scaffold plus reusable device, room, and event feature builders for both seasonal datasets.**

## What Happened

Created/confirmed `backend/notebooks/07_event_based_device_control.ipynb` as the T01 pipeline scaffold with configuration dictionaries, both-season data loading, device-level features, room-level aggregations, event features, and printed data-quality summaries. Strengthened `backend/notebooks/utils.py` with reusable feature builders: deterministic device-wide columns for `device_i_power_kw` and `device_i_active`, room-level median/sum aggregations, and event/preconditioning features with input validation. Added targeted regression tests in `backend/tests/test_utils.py` for successful feature construction and malformed inputs.

## Failure Modes

External dependencies are local filesystem CSV/cache reads (`backend/data/...`, `backend/data/processed/...`), the backend uv environment/subprocesses used for validation, and notebook execution through a local Jupyter kernel. CSV/schema failures bubble as `FileNotFoundError` or `ValueError` via loader and helper validation; malformed event intervals ending before start now raise `ValueError`; missing critical device/room columns now raise `ValueError`; invalid device/event parameters such as negative standby baselines or preconditioning windows raise `ValueError`. Notebook and uv subprocess failures bubble through non-zero verification exits.

## Load Profile

The runtime load dimension is local pandas processing over seasonal 15-minute device grids. The first likely 10x saturation point is memory during dataframe joins/pivots and notebook execution, not network or API throughput. Protection is bounded feature width (`expected_devices=4` by default), timestamp-level grouping/reindexing, and use of cached processed seasonal CSVs for notebook-stage work; no unbounded remote calls, pools, or pagination are involved.

## Negative Tests

Negative coverage was added in `backend/tests/test_utils.py`: unknown window rejection across loaders/builders; missing processed cache raises `FileNotFoundError`; device-level feature input without a `DatetimeIndex` or without `was_adjusting_temperature` raises `ValueError`; event data with `ends_at < starts_at` raises `ValueError`. Existing tests also cover missing required loader columns and warnings for absent optional columns.

## Verification

Verified with the backend uv environment. The final verification bundle ran Ruff on touched files, pytest for `backend/tests/test_utils.py`, backend compileall, the required import command, full notebook execution via `ExecutePreprocessor`, and both-season data-pipeline checks. Heating and cooling outputs were confirmed on a 15-minute grid with eight device feature columns and zero missing values in critical room/event fields.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend ruff check backend/notebooks/utils.py backend/tests/test_utils.py && uv run --project backend pytest backend/tests/test_utils.py -q && uv run --project backend python -m compileall -q backend && uv run --project backend python -c "from backend.notebooks.utils import *; print('import ok')" && uv run --project backend python - <<'PY'
import nbformat
import pandas as pd
from nbconvert.preprocessors import ExecutePreprocessor
from notebooks.utils import build_device_level_features, build_event_features, build_room_level_features, load_processed, load_space_events
with open('backend/notebooks/07_event_based_device_control.ipynb', encoding='utf-8') as fh:
    nb = nbformat.read(fh, as_version=4)
ExecutePreprocessor(timeout=600, kernel_name='python3').preprocess(nb, {'metadata': {'path': 'backend/notebooks'}})
print('notebook_execution ok')
critical = ['room_temp', 'room_return_temp', 'room_humidity', 'room_co2', 'room_power_kw', 'outside_temperature', 'event_active']
for season, baseline in [('heating', 1.2), ('cooling', 2.0)]:
    raw = load_processed(season)
    events = load_space_events(season)
    device = build_device_level_features(raw, baseline)
    room = build_room_level_features(raw)
    event_features = build_event_features(room.index, events, 2.0)
    final = pd.concat([room, device, event_features], axis=1)
    diffs = pd.Series(room.index).diff().dropna()
    missing = {col: int(final[col].isna().sum()) for col in critical}
    device_cols = [col for col in final.columns if col.startswith('device_')]
    assert (diffs == pd.Timedelta(minutes=15)).all(), season
    assert all(count == 0 for count in missing.values()), (season, missing)
    assert len(device_cols) == 8, (season, device_cols)
    print(season, 'raw_rows', len(raw), 'final_rows', len(final), 'events', len(events), 'device_cols', len(device_cols), 'critical_missing', missing)
PY` | 0 | ✅ pass | 10671ms |

## Deviations

The notebook scaffold already existed, so the implementation extended and hardened its supporting utility functions and tests rather than replacing the notebook wholesale.

## Known Issues

Notebook execution emits a local Jupyter kernel warning about TCP transport encryption; this is a local execution warning and did not affect pipeline correctness.

## Files Created/Modified

- `backend/notebooks/07_event_based_device_control.ipynb`
- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
