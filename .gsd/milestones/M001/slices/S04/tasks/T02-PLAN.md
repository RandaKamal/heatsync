---
estimated_steps: 38
estimated_files: 1
skills_used: []
---

# T02: Added PyTorch PINN sections to 04_physical_modeling.ipynb with composite loss and verified convergence.

## Why
R004 requires constructing a Physics-Informed Neural Network (PINN) in PyTorch. The PINN demonstrates integrating physical laws (heat equation residual) with neural network training. This is the second major proof for the slice.

## Do
1. Read the existing `backend/notebooks/04_physical_modeling.ipynb` (from T01) to understand current structure and cell count.
2. Append new sections to the notebook after the 2R2C results:
3. **Section 6 (PINN Architecture):** Markdown cell explaining physics-informed neural networks — a standard MLP that predicts indoor temperature, trained with a composite loss: data MSE + physics residual from the heat equation. Code cell defining a `PINN(nn.Module)` class:
   - Input: normalized time, T_out, Q features (3 inputs).
   - Architecture: 3-4 hidden layers with 32-64 neurons each, Tanh or ReLU activation.
   - Output: predicted T_indoor (1 output).
4. **Section 7 (Physics-Informed Loss):** Code cell implementing:
   - `data_loss`: MSE between predicted and observed T_indoor.
   - `physics_loss`: finite-difference approximation of heat-equation residual. Use the simplified 1D heat balance: `dT/dt ≈ alpha * (T_out - T_pred) + beta * Q`. Compute dT/dt via finite differences on the predicted sequence. The residual is `dT_pred/dt - alpha*(T_out - T_pred) - beta*Q`. Physics loss = MSE of residual.
   - `total_loss = data_loss + lambda_phys * physics_loss` with `lambda_phys` as a tunable weight (start with 0.1).
   - Normalize inputs (time, T_out, Q) with sklearn StandardScaler or manual min-max before training.
5. **Section 8 (PINN Training Loop):** Code cell:
   - Set seeds: `torch.manual_seed(42)`, `np.random.seed(42)`.
   - Prepare tensors from heating data (same device subset as 2R2C).
   - Use Adam optimizer, lr=1e-3.
   - Train for 500-1000 epochs (bounded for notebook execution time).
   - Log total_loss, data_loss, physics_loss every 50-100 epochs.
   - Store loss history for plotting.
6. **Section 9 (PINN Results):** Code cells showing:
   - Loss curve plot (total, data, physics components over epochs) demonstrating convergence/stabilization.
   - PINN predicted-vs-observed temperature plot.
   - RMSE of PINN predictions.
   - Markdown interpretation comparing PINN to 2R2C results, noting that PINN is a demonstration of physics-informed training rather than a competitor.
7. **Section 10 (Summary & Forward Look):** Markdown cell summarizing:
   - 2R2C calibration proved positive physical parameters.
   - PINN training demonstrated physics-informed convergence.
   - These physical models provide a foundation for S06 energy controls work.
   - Honest assessment of limitations.
8. Ensure all new cells maintain the notebook's numbered-section convention and clean formatting.

## Done-when
- `backend/notebooks/04_physical_modeling.ipynb` contains Sections 6-10 with PINN implementation.
- Running the full notebook programmatically completes without error.
- The output contains a PINN loss curve showing decreasing or stabilizing loss.
- The output contains PINN predicted-vs-observed plot.
- `uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb` passes.

## Inputs

- `backend/notebooks/04_physical_modeling.ipynb`
- `backend/notebooks/utils.py`
- `backend/data/processed/processed_heating.csv`

## Expected Output

- `backend/notebooks/04_physical_modeling.ipynb`

## Verification

uv run --project backend jupyter nbconvert --to notebook --execute backend/notebooks/04_physical_modeling.ipynb --ExecutePreprocessor.timeout=300 && uv run --project backend ruff check backend/notebooks/04_physical_modeling.ipynb
