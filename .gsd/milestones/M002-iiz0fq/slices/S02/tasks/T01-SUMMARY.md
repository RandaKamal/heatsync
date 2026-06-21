---
id: T01
parent: S02
milestone: M002-iiz0fq
key_files:
  - backend/notebooks/utils.py
  - backend/tests/test_utils.py
key_decisions:
  - Defined structured dataclasses (EventControlConfig, ConsolidatedEventWindow, ScheduleRow) in utils.py to serve as the optimizer interface contract
  - Implemented extract_events_from_frame to extract contiguous space occupancy periods as event windows
  - Implemented consolidate_event_windows with configurable merge threshold to merge overlapping or close back-to-back event windows into consolidated windows
duration: 
verification_result: passed
completed_at: 2026-06-21T05:52:22.080Z
blocker_discovered: false
---

# T01: Added optimizer contracts, validation logic, device column discovery, and event-window consolidation utility functions with extensive unit test coverage

**Added optimizer contracts, validation logic, device column discovery, and event-window consolidation utility functions with extensive unit test coverage**

## What Happened

Added the optimizer contracts and consolidation logic to the shared utilities library in `backend/notebooks/utils.py`. The contracts consist of dataclasses EventControlConfig, ConsolidatedEventWindow, and ScheduleRow, which govern input validation and candidate simulation schedule outputs. The extraction and consolidation helper functions extract contiguous blocks of occupancy_flag == 1 events from historical/aligned datasets and merge overlapping or close back-to-back events under a configurable threshold. We also added full unit tests to `backend/tests/test_utils.py` verifying correct functionality under various scenarios including overlapping, duplicate, separated, and negative-threshold inputs.

## Verification

Executed pytest against the newly added tests to verify correct functionality under duplicate, overlapping, and close back-to-back events.

## Verification Evidence

| # | Command | Exit Code | Verdict | Duration |
|---|---------|-----------|---------|----------|
| 1 | `uv run --project backend pytest backend/tests/test_utils.py -p no:launch_testing -p no:launch_testing_ros_pytest_entrypoint` | 0 | ✅ pass | 3191ms |

## Deviations

None.

## Known Issues

None.

## Files Created/Modified

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
