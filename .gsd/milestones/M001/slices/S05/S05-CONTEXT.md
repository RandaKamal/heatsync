---
id: S05
milestone: M001
status: ready
---

# S05: Anomaly Detection Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create an anomaly-detection notebook that uses S01’s 15-minute aligned data to run Isolation Forest, One-Class SVM, and Autoencoder detectors, then presents a ranked shortlist of suspicious timestamps with Modbus alarm context.

## Why this Slice

This slice follows S01 because anomaly detection depends on the normalized 15-minute dataframe, shared feature helpers, data-quality signals, and preserved alarm/register fields produced by preprocessing. It provides the milestone’s anomaly-detection proof by surfacing real suspicious sensor periods and Modbus alarm context, while staying separate from forecasting, physical modeling, controls, and production monitoring concerns.

## Scope

### In Scope

- Build `05_anomaly_detection.ipynb` as a runnable, reader-friendly anomaly triage notebook using S01 aligned data and shared utilities.
- Select anomaly-detection features from S01 outputs based on coverage, physical meaning, and availability of sensor, temperature, power, operating-state, and alarm/register columns.
- Run Isolation Forest, One-Class SVM, and Autoencoder detectors with equal visible roles in the notebook.
- Present each detector’s suspicious timestamps or scores clearly enough for a reader to understand what each model flagged.
- Combine detector results into a ranked investigation shortlist rather than declaring definitive faults.
- Include confidence/context cues such as detector source, detector vote count, rank, score or severity proxy, nearby sensor values, and Modbus alarm context where available.
- Show Modbus alarm timestamps or periods as corroborating context in output tables and timeline plots, without treating alarms as complete ground-truth labels.
- Produce a concise top anomaly timestamp table and a timeline plot marking suspicious periods, detector flags, and alarm context.
- Explain detector disagreement, weak signals, or noisy outputs honestly as uncertainty and false-positive risk.

### Out of Scope

- Reimplementing S01 preprocessing, timestamp alignment, or data-quality checks inside the anomaly notebook.
- Treating Modbus alarms as exhaustive labels or scoring detector quality solely by alarm overlap.
- Building a production monitoring system, live alerting workflow, retraining pipeline, or operational threshold management.
- Turning S05 into a forecasting-residual anomaly system based on S02 or S03 model residuals.
- Physical-model residual analysis, 2R2C/PINN diagnostics, or controls-oriented fault handling; those belong outside this slice.
- Occupancy controls, comfort setpoints, setback strategies, HVAC kWh savings, or optimization; those belong to S06.
- Exhaustive anomaly forensics or manual root-cause classification for every flagged timestamp.
- Full notebook-suite execution tests; those belong to S07.

## Constraints

- S05 depends on S01 and should consume the shared 15-minute aligned dataframe and helpers rather than duplicating preprocessing logic.
- Shared helper imports should come from `backend/notebooks/utils.py` per decision D001.
- PyTorch is the selected deep learning framework for the Autoencoder model per decision D002.
- The notebook must run end-to-end programmatically with zero exceptions as part of the milestone’s notebook-suite goal.
- The milestone requires anomaly detection models to flag real sensor anomalies and Modbus alarm registers, so notebook outputs must visibly include suspicious timestamps and alarm context.
- Detector outputs should be framed as investigation candidates, not confirmed faults, unless an input alarm or obvious sensor condition provides stronger corroboration.
- Output should stay concise enough for a human reader and automated notebook checks to inspect; avoid overwhelming the notebook with unranked exhaustive flags.
- Autoencoder training should be bounded and deterministic enough for reliable notebook execution.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared loading, aligned-data access, generic feature, data-quality, and metric helpers used to prepare anomaly-detection inputs without redoing preprocessing.
- `backend/notebooks/01_preprocessing.ipynb` — Predecessor notebook documenting the normalized 15-minute data foundation, coverage, gap handling, and preserved alarm/register context.
- `backend/data/processed/` or the repository’s selected S01 processed-data artifact location — Deterministic 15-minute aligned dataframe used for detector inputs.
- `backend/data/` — Raw HeatSync data only indirectly, through S01 utilities or regenerated preprocessing outputs when needed.

### Produces

- `backend/notebooks/05_anomaly_detection.ipynb` — Runnable anomaly triage notebook showing feature selection, Isolation Forest flags, One-Class SVM flags, Autoencoder reconstruction anomalies, ranked anomaly shortlist, alarm context, plots, and honest interpretation.
- Notebook output table of ranked anomaly timestamps — Human-readable and automation-friendly evidence of suspicious periods, detector votes/scores, and Modbus alarm context.
- Timeline plot with anomaly markers and alarm annotations — Visual proof of where suspicious periods occur in the aligned data.
- Detector-specific output summaries — Evidence that Isolation Forest, One-Class SVM, and Autoencoder each ran and contributed visible results.

## Open Questions

- Which exact S01 features should be used for anomaly detection? — Current thinking: choose a small, meaningful feature set with good coverage, including temperature, power or operating-state proxies, and available alarm/register context, while avoiding feature clutter.
- What top-N size or threshold should define the ranked shortlist? — Current thinking: prefer a concise, readable shortlist selected by detector scores and vote overlap, with thresholds documented in notebook text.
- How should detector scores be normalized for ranking across models? — Current thinking: use simple within-model score normalization or rank aggregation so combined output is explainable rather than statistically overclaimed.
- Should anomaly events be saved as a deterministic artifact? — Current thinking: notebook-visible tables are sufficient unless S07 verification clearly benefits from an exported dataframe or file.
- How should missing or sparse alarm registers be handled? — Current thinking: warn or explain that alarm context is unavailable or partial, then continue with detector-only anomaly ranking rather than failing the slice.
