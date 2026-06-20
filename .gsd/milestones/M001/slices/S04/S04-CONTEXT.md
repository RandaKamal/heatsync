---
id: S04
milestone: M001
status: ready
---

# S04: Physical Grey-Box and PINN Models — Context

<!-- Slice-scoped context. Milestone-only sections (acceptance criteria, completion class,
     milestone sequence) do not belong here — those live in the milestone context. -->

## Goal

Create a physical-modeling notebook that calibrates a 2R2C thermal model to positive physical parameters and demonstrates bounded PINN training convergence on the S01 15-minute aligned data.

## Why this Slice

This slice carries the highest technical risk in M001 because it must prove that physical-model fitting can converge to plausible positive parameters, not just produce forecast-like plots. It follows S01 because it depends on the normalized 15-minute dataframe, shared feature helpers, and data-quality signals, and it must be proven before S06 can responsibly build control and savings scenarios on top of physical model behavior.

## Scope

### In Scope

- Build `04_physical_modeling.ipynb` as a runnable, reader-friendly physical-modeling notebook using S01 aligned data and shared utilities.
- Select clear physical inputs from S01, such as primary indoor temperature, ambient/outdoor temperature, and heat-pump power or operating-state proxy, based on coverage and physical meaning.
- State the model assumptions visibly, including sampling interval, units or normalization, heat-input proxy limitations, and any simplified heat-flow assumptions.
- Calibrate a 2R2C grey-box thermal model using bounded optimization with positive R and C constraints.
- Use transparent bounded random restarts or equivalent retry diagnostics for calibration and report which attempts converged or failed.
- Show a parameter table with physically valid positive resistance and capacitance values as the central 2R2C proof.
- Show fitted-versus-observed or prediction-versus-observed temperature plots to make physical-model behavior understandable to a reader.
- Demonstrate a bounded PyTorch PINN training loop with visible convergence evidence, such as a decreasing or stabilized loss curve and explained physics-informed residual term.
- Interpret results honestly when 2R2C fit quality is limited or PINN accuracy is weaker than grey-box calibration.

### Out of Scope

- Reimplementing S01 preprocessing, timestamp alignment, or data-quality handling inside the physical-modeling notebook.
- Treating 2R2C or PINN primarily as competitors to SARIMAX or LSTM forecasting models from S02 and S03.
- Requiring the PINN to beat 2R2C or become the primary proof for the slice.
- Extensive parameter uncertainty analysis, broad sensitivity studies, or research-grade thermal-model validation beyond the notebook proof.
- Occupancy heat-gain modeling, comfort setpoints, setback strategies, HVAC kWh savings, or control optimization; those belong to S06.
- Anomaly scoring or alarm analysis; those belong to S05.
- Persisting trained PINN weights, building a model registry, deployment packaging, or production simulation pipelines.
- Full notebook-suite execution tests; those belong to S07.

## Constraints

- S04 depends on S01 and should consume the shared 15-minute aligned dataframe and helpers rather than duplicating preprocessing logic.
- Shared helper imports should come from `backend/notebooks/utils.py` per decision D001.
- PyTorch is the selected deep learning framework for PINN work per decision D002.
- 2R2C calibration should use `scipy.optimize.minimize` with L-BFGS-B and parameter bounds per decision D003.
- The milestone requires 2R2C calibration to converge to valid positive physical parameters, so R and C values must remain positive for the slice proof.
- The notebook must run end-to-end programmatically with zero exceptions as part of the milestone’s notebook-suite goal.
- Training and optimization should be bounded and reproducible enough for automated notebook execution.
- Weak fit, boundary-hugging attempts, noisy PINN training, or non-improving results should be visible in diagnostics rather than hidden.
- Scenario simulation and energy-savings claims must be deferred to S06 to keep this slice focused on physical-model proof.

## Integration Points

### Consumes

- `backend/notebooks/utils.py` — Shared loading, aligned-data access, generic feature, and data-quality helpers used to prepare physical-model inputs without redoing preprocessing.
- `backend/notebooks/01_preprocessing.ipynb` — Predecessor notebook documenting the normalized 15-minute data foundation and quality assumptions.
- `backend/data/processed/` or the repository’s selected S01 processed-data artifact location — Deterministic 15-minute aligned dataframe used for 2R2C calibration and PINN training examples.
- `.gsd/DECISIONS.md` — Existing framework and calibration-method decisions that constrain S04 implementation.

### Produces

- `backend/notebooks/04_physical_modeling.ipynb` — Runnable notebook showing physical input selection, 2R2C calibration, positive parameter output, fitted-versus-observed plots, PINN training, loss curves, and honest interpretation.
- Notebook output table of calibrated 2R2C parameters — Human-readable and automation-friendly evidence that R and C values are positive.
- Notebook output diagnostics for optimizer attempts — Evidence of transparent retries, convergence status, and calibration limitations.
- PINN loss-curve output — Evidence that the physics-informed model training ran and produced convergence or stabilization behavior.
- Concise interpretation notes — Reader-facing explanation of what later S06 controls work may rely on, without implementing control scenarios in S04.

## Open Questions

- Which exact S01 columns should represent indoor temperature, ambient/outdoor temperature, and heat input? — Current thinking: choose the clearest, best-covered columns with physically meaningful names, and document any proxy limitations directly in the notebook.
- What exact 2R2C equations and discretization should be used? — Current thinking: choose a simple, explainable discrete-time formulation that matches the 15-minute sampling interval and can be calibrated with positive bounds.
- What convergence diagnostics should count as acceptable beyond positive R and C values? — Current thinking: report optimizer status, objective value, restart outcomes, and fitted-versus-observed behavior; avoid strict fit-quality thresholds unless implementation reveals a clear need.
- Should physical-model equations be moved into reusable helpers? — Current thinking: keep them notebook-local unless S06 clearly needs the same equations or simulation functions, in which case small well-documented helpers may be added to `utils.py`.
- How much PINN complexity is appropriate? — Current thinking: keep the network, epochs, and loss terms small enough for reliable notebook execution while still showing the physics-informed residual concept and convergence evidence.
