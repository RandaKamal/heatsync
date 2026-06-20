import os
import sys

import nbformat  # type: ignore[import-untyped]
import numpy as np
import scipy.optimize  # type: ignore[import-untyped]
import torch
from nbconvert.preprocessors import ExecutePreprocessor  # type: ignore[import-untyped]
from sklearn.preprocessing import StandardScaler  # type: ignore[import-untyped]
from torch import nn

# Ensure the backend directory is in the path
backend_path = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from notebooks.utils import load_processed  # noqa: E402

SECONDS_PER_HOUR = 3_600.0
MAX_ABSOLUTE_TEMPERATURE = 1_000.0
UNSTABLE_OBJECTIVE_PENALTY = 1e12


def simulate_2r2c(
    params: np.ndarray,
    T_in_init: float,
    T_wall_init: float,
    T_out: np.ndarray,
    Q: np.ndarray,
    dt: float,
) -> np.ndarray:
    """Simulate indoor temperature for a discrete 2R2C model."""
    R_in, C_in, R_out, C_wall = params
    if np.any(np.asarray(params, dtype=float) <= 0):
        raise ValueError("2R2C parameters must all be positive.")

    dt_hours = dt / SECONDS_PER_HOUR
    n_steps = len(T_out)
    T_pred = np.empty(n_steps, dtype=float)
    T_indoor = float(T_in_init)
    T_wall = float(T_wall_init)
    T_pred[0] = T_indoor

    for k in range(n_steps - 1):
        indoor_delta = dt_hours / C_in * (((T_wall - T_indoor) / R_in) + Q[k])
        wall_delta = dt_hours / C_wall * (
            ((T_out[k] - T_wall) / R_out) - ((T_wall - T_indoor) / R_in)
        )
        T_indoor = T_indoor + indoor_delta
        T_wall = T_wall + wall_delta

        if not np.isfinite(T_indoor) or not np.isfinite(T_wall):
            T_pred[k + 1 :] = np.nan
            break

        # Guard against unstable candidate parameters dominating optimizer time.
        if (
            abs(T_indoor) > MAX_ABSOLUTE_TEMPERATURE
            or abs(T_wall) > MAX_ABSOLUTE_TEMPERATURE
        ):
            T_pred[k + 1 :] = np.nan
            break

        T_pred[k + 1] = T_indoor

    return T_pred


class PINN(nn.Module):
    """
    Multi-Layer Perceptron representing the Physics-Informed Neural Network.
    Predicts indoor temperature from normalized time, outdoor temperature, and power draw.
    """

    def __init__(self, input_dim: int = 3, hidden_dim: int = 32, output_dim: int = 1) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, hidden_dim),
            nn.Tanh(),
            nn.Linear(hidden_dim, output_dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.net(x)


def _prepare_pinn_data() -> tuple[
    torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, float, np.ndarray
]:
    """Helper to load and scale data for PINN convergence test."""
    df = load_processed("heating")
    device_id = df["device_id"].dropna().unique()[0]
    dev_df = df[df["device_id"] == device_id].copy()
    
    physical_cols = [
        "status_temperature_in_celsius",
        "outside_temperature",
        "power_draw_kw",
    ]
    model_df = (
        dev_df[physical_cols]
        .rename(
            columns={
                "status_temperature_in_celsius": "T_in",
                "outside_temperature": "T_out",
                "power_draw_kw": "Q",
            }
        )
        .dropna()
    )
    
    model_df = model_df.iloc[:300].copy()
    dt = 900.0
    
    T_in = model_df["T_in"].to_numpy(dtype=float)
    T_out = model_df["T_out"].to_numpy(dtype=float)
    Q = model_df["Q"].to_numpy(dtype=float)
    
    dt_hours = dt / SECONDS_PER_HOUR
    time_hours = np.arange(len(model_df)) * dt_hours
    X = np.stack([time_hours, T_out, Q], axis=1)
    
    scaler = StandardScaler()
    X_norm = scaler.fit_transform(X)
    
    X_tensor = torch.tensor(X_norm, dtype=torch.float32)
    T_in_tensor = torch.tensor(T_in, dtype=torch.float32).unsqueeze(1)
    T_out_tensor = torch.tensor(T_out, dtype=torch.float32).unsqueeze(1)
    Q_tensor = torch.tensor(Q, dtype=torch.float32).unsqueeze(1)
    
    return X_tensor, T_in_tensor, T_out_tensor, Q_tensor, dt_hours, T_in


def test_2r2c_calibration_positive_params() -> None:
    """
    Verifies that we can load preprocessed heating data, prepare a single device's
    time series, run bounded L-BFGS-B optimization, and retrieve positive parameters.
    """
    df = load_processed("heating")
    assert not df.empty
    
    device_id = df["device_id"].dropna().unique()[0]
    dev_df = df[df["device_id"] == device_id].copy()
    
    physical_cols = [
        "status_temperature_in_celsius",
        "outside_temperature",
        "power_draw_kw",
    ]
    model_df = (
        dev_df[physical_cols]
        .rename(
            columns={
                "status_temperature_in_celsius": "T_in",
                "outside_temperature": "T_out",
                "power_draw_kw": "Q",
            }
        )
        .dropna()
    )
    
    # Use first 300 rows like the notebook
    model_df = model_df.iloc[:300].copy()
    dt = 900.0
    
    T_in = model_df["T_in"].to_numpy(dtype=float)
    T_out = model_df["T_out"].to_numpy(dtype=float)
    Q = model_df["Q"].to_numpy(dtype=float)
    
    T_wall_init = (T_in[0] + T_out[0]) / 2
    bounds = [(0.001, 50.0)] * 4
    
    def objective(params: np.ndarray) -> float:
        T_pred = simulate_2r2c(params, T_in[0], T_wall_init, T_out, Q, dt)
        if not np.all(np.isfinite(T_pred)):
            return UNSTABLE_OBJECTIVE_PENALTY
        return float(np.mean((T_pred - T_in) ** 2))
        
    np.random.seed(42)
    restart_results = []
    # Run bounded L-BFGS-B optimization with 3 random restarts
    for _ in range(3):
        x0 = np.random.uniform(0.1, 25.0, size=4)
        result = scipy.optimize.minimize(
            objective,
            x0=x0,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 100, "ftol": 1e-6}, # lower maxiter for test speed
        )
        restart_results.append(result)
        
    best_result = min(restart_results, key=lambda res: res.fun)
    best_params = best_result.x
    
    # Assert optimizer converges (at least to a reasonable threshold)
    assert best_result.fun < UNSTABLE_OBJECTIVE_PENALTY
    
    # Assert all 4 parameters (R_in, C_in, R_out, C_wall) are > 0
    assert (best_params > 0).all()
    
    # Assert RMSE of fitted vs observed is finite and positive
    T_fit = simulate_2r2c(best_params, T_in[0], T_wall_init, T_out, Q, dt)
    assert np.all(np.isfinite(T_fit))
    rmse = float(np.sqrt(np.mean((T_fit - T_in) ** 2)))
    assert np.isfinite(rmse)
    assert rmse > 0.0


def test_pinn_convergence() -> None:
    """
    Verifies PyTorch PINN model training convergence with composite data MSE + physics loss.
    """
    X_tensor, T_in_tensor, T_out_tensor, Q_tensor, dt_hours, T_in = _prepare_pinn_data()
    
    # Fixed parameters for PINN derived from expected physics calibration
    # to avoid nested optimization in this test.
    R_in_cal, C_in_cal, _R_out_cal, _C_wall_cal = 10.0, 5.0, 10.0, 15.0
    alpha = 1.0 / (R_in_cal * C_in_cal)
    beta = 1.0 / C_in_cal
    
    torch.manual_seed(42)
    np.random.seed(42)
    
    pinn_model = PINN(input_dim=3, hidden_dim=32, output_dim=1)
    optimizer = torch.optim.Adam(pinn_model.parameters(), lr=1e-3)
    epochs = 100
    lambda_phys = 0.1
    
    initial_loss = None
    final_loss = None
    
    for epoch in range(epochs):
        optimizer.zero_grad()
        T_pred = pinn_model(X_tensor)
        
        # 1. Data Loss
        data_loss = torch.mean((T_pred - T_in_tensor) ** 2)
        
        # 2. Physics Loss
        dT_pred_dt = (T_pred[1:] - T_pred[:-1]) / dt_hours
        T_pred_k = T_pred[:-1]
        T_out_k = T_out_tensor[:-1]
        Q_k = Q_tensor[:-1]
        
        residual = dT_pred_dt - (alpha * (T_out_k - T_pred_k) + beta * Q_k)
        physics_loss = torch.mean(residual ** 2)
        
        total_loss = data_loss + lambda_phys * physics_loss
        total_loss.backward()
        optimizer.step()
        
        if epoch == 0:
            initial_loss = total_loss.item()
        if epoch == epochs - 1:
            final_loss = total_loss.item()
            
    assert initial_loss is not None
    assert final_loss is not None
    assert np.isfinite(final_loss)
    # Assert training improves (loss decreases)
    assert final_loss < initial_loss
    
    # Assert predictions have same length and are finite
    pinn_model.eval()
    with torch.no_grad():
        T_pred_eval = pinn_model(X_tensor).numpy()
    assert len(T_pred_eval) == len(T_in)
    assert np.all(np.isfinite(T_pred_eval))


def test_notebook_execution() -> None:
    """
    Asserts that the physical modeling notebook runs completely without errors.
    """
    notebook_path = "backend/notebooks/04_physical_modeling.ipynb"
    assert os.path.exists(notebook_path), f"Notebook not found at: {notebook_path}"
    
    with open(notebook_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)
        
    ep = ExecutePreprocessor(timeout=300, kernel_name="python3")
    # Execute with context path set to the backend directory or notebooks directory
    # so that imports and file references resolve properly.
    ep.preprocess(nb, {"metadata": {"path": "backend/notebooks"}})
