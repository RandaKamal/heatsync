# M001-992333 Discussion Log

## Exchange — 2026-06-19T22:04:01.852Z

### Data Source

How should the example notebooks obtain the building sensor datasets for their demonstrations?

- **Synthetic data (Recommended)** — Generate realistic simulated datasets directly within the notebooks for self-contained execution.
- **Public download** — Provide a helper script/instructions to download an open public building dataset.

**Selected:** None of the above
**Notes:** We already have the data from the backend/data  from our dataset so we use exactly that one
---

## Exchange — 2026-06-19T22:06:13.062Z

### Data Scope

Which time windows/seasons from the dataset should the notebooks demonstrate?

- **Both Heating & Cooling (Recommended)** — Demonstrate preprocessing, modeling, and controls for both heating and cooling periods.
- **Heating only** — Focus only on the heating period (2026-03-30 to 2026-04-05).
- **Cooling only** — Focus only on the cooling period (2026-05-25 to 2026-05-31).

**Selected:** Both Heating & Cooling (Recommended)
---

## Exchange — 2026-06-19T22:07:45.741Z

### Notebook Code

Should the notebooks be fully self-contained, or should they share a common helper module?

- **Fully self-contained (Recommended)** — Each notebook is fully self-contained, containing all data loading, functions, and models for easy independent execution.
- **Shared helper module** — Extract shared functions (like preprocessing and alignment) into a helper module to minimize duplication.

**Selected:** Shared helper module
---

## Exchange — 2026-06-19T22:37:26.395Z

### Error Handling

Which error handling strategy do you prefer for the example notebooks?

- **Sensible defaults (Recommended)** — Apply sensible defaults (e.g. robust CSV parser error catching, data validation check alerts in code, clear exception trace logs).
- **Go deep on failures** — Go deep on error propagation, custom exception classes, and edge cases in the notebooks.

**Selected:** Sensible defaults (Recommended)
---

## Exchange — 2026-06-19T22:54:16.273Z

### Depth Check

Did I capture the depth right?

- **Yes, you got it (Recommended)** — Proceed to candidate requirements and roadmap setup.
- **Not quite — let me clarify** — I would like to clarify some aspects of the depth summary.

**Selected:** Yes, you got it (Recommended)
---

