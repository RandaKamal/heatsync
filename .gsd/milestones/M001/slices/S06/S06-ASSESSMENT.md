---
sliceId: S06
uatType: artifact-driven
verdict: PASS
attempt: 1
runId: uat:M001:S06:attempt-1
worktreeRoot: /home/jovyan/heatsync
date: 2026-06-20T16:04:36.322Z
---

# UAT Result - S06

## Checks

| Check | Mode | Result | Evidence | Notes |
|-------|------|--------|----------|-------|
| The notebook executes end-to-end programmatically with zero exceptions. | runtime | PASS | gsd_uat_exec:efdb915d-c139-4eed-833c-3a749f02fd2e |  |
| A table comparing at least 3 scenarios (e.g., Baseline, Mild Setback, Deep Setback) is rendered with baseline kWh, setback kWh, estimated savings, and comfort status. | runtime | PASS | gsd_uat_exec:218852d2-5eb9-452a-80ed-5593a94d96e6 |  |
| Comfort violations are correctly detected and flagged when indoor temperature falls below 20°C or rises above 24°C during occupied hours. | runtime | PASS | gsd_uat_exec:4c5c0613-03ac-400c-8f55-d005575195c0 |  |
| Sensible (0.15 kW) and latent (0.05 kW) heat gains are calculated correctly based on the occupied/unoccupied schedules. | runtime | PASS | gsd_uat_exec:f2528fe2-5840-4f59-8c65-c774cf53eccb |  |
| 2R2C forward simulation models thermal response correctly under setbacks, and HVAC power responds dynamically to meet scheduled setpoints. | runtime | PASS | gsd_uat_exec:bd55eaf4-0050-42cb-9098-24f1c71f0946 |  |

## Overall Verdict

PASS - All tests in backend/tests/test_energy.py and 06_energy_controls.ipynb programmatic execution completed with zero failures, proving setback savings and comfort constraints are correctly implemented.

## Tool Presentation

```json
{
  "toolPresentationPlanId": "run-uat/default-v1",
  "blockedTools": [
    {
      "name": "edit",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "write",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_exec",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_summary_save",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "gsd_save_gate_result",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "search-the-web",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "WebSearch",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Bash",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Write",
      "reason": "forbidden during run-uat"
    },
    {
      "name": "Edit",
      "reason": "forbidden during run-uat"
    }
  ],
  "notes": "Standard audit payload",
  "fallbackToolsUsed": [],
  "surface": "mcp",
  "model": {
    "api": "default_api",
    "id": "pi",
    "provider": "GSD"
  },
  "presentedTools": [
    "gsd_uat_exec",
    "gsd_uat_result_save",
    "gsd_resume",
    "gsd_milestone_status",
    "gsd_journal_query",
    "find",
    "glob",
    "grep",
    "ls",
    "read"
  ]
}
```

## Gate

Aggregate UAT gate saved as pass.
