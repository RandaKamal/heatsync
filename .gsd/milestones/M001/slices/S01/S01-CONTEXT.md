---
id: S01
milestone: M001
status: ready
---

# S01: Data Preprocessing and Shared Utilities — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Deliver conservative shared preprocessing utilities and a teaching-oriented preprocessing notebook that convert raw HeatSync CSV inputs into normalized 15-minute aligned dataframes for downstream modeling slices.

## Why this Slice

This slice is first because every forecasting, physical modeling, anomaly detection, controls, and notebook verification slice depends on a consistent view of the raw HeatSync data. Establishing conservative alignment, visible data-quality signals, and shared helper functions now prevents later notebooks from duplicating incompatible preprocessing assumptions.

## Scope

### In Scope

- Load raw snap, interval, and power CSV data from `backend/data/` through reusable helpers in `backend/notebooks/utils.py`.
- Normalize timestamps onto a 15-minute clock using conservative alignment that favors trustworthy rows and reliable aligned periods over maximum coverage.
- Surface data coverage and gap signals in `01_preprocessing.ipynb`, including raw versus aligned row counts, source date ranges, missing 15-minute intervals, interpolation counts, and source coverage per sensor/file.
- Provide generic shared features and quality flags that are broadly useful to later notebooks without embedding model-specific assumptions.
- Make `01_preprocessing.ipynb` read as a teaching walkthrough with clear section headings, before/after summaries, sample tables, and simple alignment sanity-check plots.
- Fail loudly on required raw input or schema problems, with clear errors that identify the affected file or column; use warnings and quality flags for recoverable data-quality issues.
- Cache a deterministic processed dataframe artifact for downstream notebooks and automated tests while still exposing helper functions that can rebuild it.

### Out of Scope

- SARIMAX-specific target construction, train/test windows, forecasting metrics, or model diagnostics; those belong to S02.
- LSTM-specific sequence generation, residual targets, or PyTorch datasets; those belong to S03.
- 2R2C/PINN calibration inputs beyond generic shared features; physical fitting and convergence proof belong to S04.
- Anomaly scoring, anomaly labels, Isolation Forest, One-Class SVM, Autoencoder logic, or Modbus alarm interpretation beyond preserving/flagging available alarm fields; those belong to S05.
- Occupancy heat-gain modeling, comfort setpoint logic, or HVAC kWh savings calculations; those belong to S06.
- Full notebook-suite execution tests for all six notebooks; those belong to S07.

## Constraints

- Shared notebook utilities must live in `backend/notebooks/utils.py` per decision D001.
- Application Python source, tests, notebooks, and Python configuration should remain under `backend/`.
- The preprocessing output must be reliable enough to serve as the common foundation for S02 through S06, so silent best-effort degradation is not acceptable for required inputs.
- The normalized dataframe should be aligned to 15-minute intervals, matching the roadmap promise for S01.
- Conservative alignment is preferred over aggressive interpolation; interpolation or filling should be visible through counts, flags, or notebook summaries.
- The notebook should remain runnable end-to-end programmatically, so human inspection may be explanatory but must not be required for successful execution.
- Exact required CSV filenames, required columns, and processed artifact path should be confirmed against repository data conventions during implementation.

## Integration Points

### Consumes

- `backend/data/` — Raw HeatSync snap, interval, power, and related CSV files used as the source data for preprocessing.
- `.gsd/DECISIONS.md` — Existing planning decisions, especially D001 locating shared utilities at `backend/notebooks/utils.py`.
- `backend/notebooks/` — Notebook workspace that will contain the shared utility module and preprocessing notebook.

### Produces

- `backend/notebooks/utils.py` — Shared loading, timestamp normalization, conservative 15-minute alignment, generic feature, and data-quality helper functions consumed by later notebooks.
- `backend/notebooks/01_preprocessing.ipynb` — Teaching-oriented walkthrough showing how raw CSVs become normalized model-ready dataframes, with visible coverage and gap diagnostics.
- `backend/data/processed/` or the repository’s existing backend-managed generated-data location — Deterministic cached processed dataframe artifact for later notebooks and automated tests; exact filename and format should be selected during implementation after checking repository conventions.

## Open Questions

- What exact processed artifact path and file format should be used? — Current thinking: prefer a deterministic backend-managed generated-data location such as `backend/data/processed/`, but confirm against existing repository conventions before implementation.
- Which CSV files and columns are mandatory versus optional? — Current thinking: mandatory inputs needed for the normalized shared dataframe should fail loudly when absent; optional sensors/registers can warn and surface missing coverage.
- What threshold separates a fatal timestamp parsing problem from a recoverable data-quality warning? — Current thinking: widespread parsing failure or inability to build the 15-minute index should fail; isolated bad rows can be dropped or flagged with counts shown in the notebook.
- How much interpolation is allowed under conservative alignment? — Current thinking: allow limited interpolation only where it preserves trust in aligned periods, and always expose interpolation counts or flags so downstream modeling slices know what was estimated.
