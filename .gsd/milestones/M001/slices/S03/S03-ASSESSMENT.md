---
sliceId: S03
uatType: artifact-driven
verdict: PASS
attempt: 1
runId: uat:M001:S03:attempt-1
worktreeRoot: /home/jovyan/heatsync
date: 2026-06-20T14:23:04.509Z
---

# UAT Result - S03

## Checks

| Check | Mode | Result | Evidence | Notes |
|-------|------|--------|----------|-------|
| Run programmatic notebook execution (03_forecasting_lstm.ipynb) | runtime | PASS | gsd_uat_exec:303307fe-45c2-4f63-adff-9deede7502db |  |
| Verify L1 RMSE/MAPE and L2 RMSE/MAPE are positive floats for Heating and Cooling runs | artifact | PASS | gsd_uat_exec:0e49a60a-358d-40d8-80b4-55b639d0f836<br>gsd_uat_exec:54078009-4dc3-4cda-9c34-37caf0a88178<br>gsd_uat_exec:26b8dfcf-9167-4448-9954-4201bf5a3188 |  |
| Run pytest suite to verify deterministic sequences and pipeline components | runtime | PASS | gsd_uat_exec:39987a67-1b54-4dff-8d2c-493d673082ad |  |

## Overall Verdict

PASS - LSTM and two-level residual-correction forecasting models verify successfully, satisfying both programmatic notebook metrics and pytest pipeline correctness.

## Tool Presentation

```json
{
  "toolPresentationPlanId": "run-uat/default-v1",
  "model": {
    "id": "claude-sonnet-4-6",
    "provider": "anthropic",
    "api": "claude-sonnet-4-6"
  },
  "surface": "mcp",
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
  ],
  "fallbackToolsUsed": []
}
```

## Gate

Aggregate UAT gate saved as pass.
