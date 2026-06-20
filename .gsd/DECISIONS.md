# Decisions Register

<!-- Append-only. Never edit or remove existing rows.
     To reverse a decision, add a new row that supersedes it.
     Read this file at the start of any planning or research phase. -->

| # | When | Scope | Decision | Choice | Rationale | Revisable? | Made By |
|---|------|-------|----------|--------|-----------|------------|---------|
| D001 | M001 | architecture | Shared helper module location for notebook utilities | backend/notebooks/utils.py | Centralizes CSV loading, 15-min clock alignment, interpolation, and feature engineering to eliminate duplication across 6 notebooks and simplify maintenance. | Yes | collaborative |
| D002 | M001 | library | Deep learning framework for LSTM, PINN, and Autoencoder models | PyTorch | PyTorch supports custom gradient computation for physics-informed loss terms (PINN heat equation residuals) with readable imperative code. Preferred over TensorFlow for custom training loops. | Yes | collaborative |
| D003 | M001 | architecture | 2R2C Grey-box model calibration method | scipy.optimize.minimize with L-BFGS-B and parameter bounds | L-BFGS-B supports box constraints ensuring positive R and C values (physical validity). Multiple random restarts mitigate local minima risk. | Yes | collaborative |
| D004 | M001 | architecture | Slice ordering strategy for risk-first planning | S04 (high risk) ordered after S01; S02/S03/S05 run in parallel (medium); S06 depends on S01+S04; S07 integrates all | S04 carries the highest risk (optimizer convergence, PINN loss balancing) and must be proven early. S02/S03/S05 are independent medium-risk slices. S07 gates final verification. | Yes | agent |
