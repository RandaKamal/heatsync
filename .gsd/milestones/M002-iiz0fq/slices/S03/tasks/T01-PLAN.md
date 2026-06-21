---
estimated_steps: 13
estimated_files: 2
skills_used: []
---

# T01: Leakage-Safe Comparison Helpers and Tests

---
skills_used:
  - design-an-interface
  - tdd
  - verify-before-complete
---
Why: S03 needs reusable, testable comparison contracts before notebook wiring so the final reports do not hide edge cases or leak measured future power into smart-control estimates.

Do:
- Add typed helpers in `backend/notebooks/utils.py` for expanding an S02 schedule into a 15-minute validation time-series, computing interval and cumulative baseline-vs-smart kWh/cost/CO2, deriving event/window comfort metrics, and classifying concise report statuses/reasons.
- Keep measured `power_draw_kw` or measured total power only in baseline columns; smart-control simulated power must come from the learned device power model helpers and schedule device flags.
- Preserve S02 schedule fields when building augmented per-event reports, then append comparison metrics such as baseline/smart kWh, EUR, CO2, savings, comfort hit rate, degree-minutes violation, and status/reason fields.
- Add focused pytest coverage in a new test module using deterministic miniature frames so infeasible/comfort-missed and negative/neutral-savings rows remain present instead of being filtered.

Done when: helper tests pass, new report/time-series helpers have stable column contracts, and tests explicitly guard leakage and edge-case visibility.

## Inputs

- `backend/notebooks/utils.py`
- `backend/tests/test_utils.py`
- `backend/artifacts/event_device_control/reports/heating_event_control_results.csv`
- `backend/artifacts/event_device_control/reports/cooling_event_control_results.csv`

## Expected Output

- `backend/notebooks/utils.py`
- `backend/tests/test_event_control_reporting.py`

## Verification

PYTHONPATH=. uv run --project backend pytest backend/tests/test_event_control_reporting.py

## Observability Impact

Creates test-covered helper-level observability for time-series columns, event report metrics, and transparent status/reason fields.
