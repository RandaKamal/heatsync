import os
import sys
from typing import cast

import nbformat
import numpy as np
import pandas as pd
import scipy.optimize
import torch
from nbconvert.preprocessors import ExecutePreprocessor
from sklearn.preprocessing import StandardScaler
from torch import nn

# Ensure the backend directory is in the path
backend_path = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from notebooks.utils import build_room_physical_model_frame, load_processed  # noqa: E402

SECONDS_PER_HOUR = 3_600.0
MAX_ABSOLUTE_TEMPERATURE = 1_000.0
UNSTABLE_OBJECTIVE_PENALTY = 1e12
RESIDUAL_EPOCHS = 250


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
        wall_delta = (
            dt_hours / C_wall * (((T_out[k] - T_wall) / R_out) - ((T_wall - T_indoor) / R_in))
        )
        T_indoor = T_indoor + indoor_delta
        T_wall = T_wall + wall_delta

        if not np.isfinite(T_indoor) or not np.isfinite(T_wall):
            T_pred[k + 1 :] = np.nan
            break

        # Guard against unstable candidate parameters dominating optimizer time.
        if abs(T_indoor) > MAX_ABSOLUTE_TEMPERATURE or abs(T_wall) > MAX_ABSOLUTE_TEMPERATURE:
            T_pred[k + 1 :] = np.nan
            break

        T_pred[k + 1] = T_indoor

    return T_pred


class ResidualCorrector(nn.Module):
    """Feed-forward residual corrector trained on the calibrated 2R2C residual."""

    def __init__(self, input_dim: int, hidden_dim: int = 32) -> None:
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(input_dim, hidden_dim),
            nn.ReLU(),
            nn.Linear(hidden_dim, hidden_dim // 2),
            nn.ReLU(),
            nn.Linear(hidden_dim // 2, 1),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return cast(torch.Tensor, self.net(x))


def _prepare_room_model_data() -> tuple[pd.DataFrame, np.ndarray, np.ndarray, np.ndarray, float]:
    """Helper to prepare room-level physical inputs for calibration and residual tests."""
    df = load_processed("heating")
    dt = 900.0
    model_df = build_room_physical_model_frame(df, dt_seconds=dt).iloc[:300].copy()

    T_in = model_df["T_in"].to_numpy(dtype=float)
    T_out = model_df["T_out"].to_numpy(dtype=float)
    Q = model_df["Q_heat_kw"].to_numpy(dtype=float)

    return model_df, T_in, T_out, Q, dt


def _fit_room_2r2c(
    T_in: np.ndarray,
    T_out: np.ndarray,
    Q: np.ndarray,
    dt: float,
) -> tuple[np.ndarray, np.ndarray, float]:
    """Calibrate the room-level 2R2C model and return parameters, fit, and objective."""
    T_wall_init = (T_in[0] + T_out[0]) / 2
    bounds = [(0.001, 50.0)] * 4

    def objective(params: np.ndarray) -> float:
        T_pred = simulate_2r2c(params, T_in[0], T_wall_init, T_out, Q, dt)
        if not np.all(np.isfinite(T_pred)):
            return UNSTABLE_OBJECTIVE_PENALTY
        return float(np.mean((T_pred - T_in) ** 2))

    np.random.seed(42)
    restart_results = []
    for _ in range(3):
        x0 = np.random.uniform(0.1, 25.0, size=4)
        result = scipy.optimize.minimize(
            objective,
            x0=x0,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 100, "ftol": 1e-6},
        )
        restart_results.append(result)

    best_result = min(restart_results, key=lambda res: res.fun)
    best_params = best_result.x
    T_fit = simulate_2r2c(best_params, T_in[0], T_wall_init, T_out, Q, dt)
    return best_params, T_fit, float(best_result.fun)


def _build_residual_features(
    model_df: pd.DataFrame,
    T_fit: np.ndarray,
    residual: np.ndarray,
) -> np.ndarray:
    """Build stateful and electrical-energy residual-correction features."""
    feature_df = model_df.copy()
    feature_df["T_2r2c"] = T_fit
    feature_df["previous_T_in"] = feature_df["T_in"].shift(1).fillna(feature_df["T_in"].iloc[0])
    feature_df["previous_residual"] = (
        pd.Series(residual, index=feature_df.index).shift(1).fillna(0.0)
    )
    feature_df["delta_T_out_in"] = feature_df["T_out"] - feature_df["T_2r2c"]
    feature_df["hour_sin"] = np.sin(2 * np.pi * feature_df["hour_of_day"] / 24.0)
    feature_df["hour_cos"] = np.cos(2 * np.pi * feature_df["hour_of_day"] / 24.0)

    feature_cols = [
        "T_2r2c",
        "previous_T_in",
        "previous_residual",
        "delta_T_out_in",
        "T_out",
        "Q_electric_kw",
        "electricity_kwh",
        "cumulative_electricity_kwh",
        "target_temp",
        "occupancy_flag",
        "is_heating_required",
        "status_is_compressor_active",
        "hour_sin",
        "hour_cos",
    ]
    assert {"Q_electric_kw", "electricity_kwh", "cumulative_electricity_kwh"} <= set(feature_cols)
    return feature_df[feature_cols].to_numpy(dtype=float)


def _train_residual_corrector(
    X: np.ndarray,
    residual: np.ndarray,
) -> tuple[np.ndarray, float | None, float | None]:
    """Train the residual corrector and return denormalized residual predictions."""
    scaler = StandardScaler()
    X_norm = scaler.fit_transform(X)

    y_mean = float(residual.mean())
    y_std = float(residual.std())
    if y_std == 0.0:
        y_std = 1.0
    y_norm = (residual - y_mean) / y_std

    X_tensor = torch.tensor(X_norm, dtype=torch.float32)
    y_tensor = torch.tensor(y_norm, dtype=torch.float32).unsqueeze(1)

    torch.manual_seed(42)
    np.random.seed(42)

    residual_model = ResidualCorrector(input_dim=X_tensor.shape[1], hidden_dim=32)
    optimizer = torch.optim.Adam(residual_model.parameters(), lr=1e-3)
    criterion = nn.MSELoss()

    initial_loss = None
    final_loss = None
    for epoch in range(RESIDUAL_EPOCHS):
        optimizer.zero_grad()
        pred = residual_model(X_tensor)
        loss = criterion(pred, y_tensor)
        loss.backward()
        optimizer.step()

        if epoch == 0:
            initial_loss = loss.item()
        if epoch == RESIDUAL_EPOCHS - 1:
            final_loss = loss.item()

    residual_model.eval()
    with torch.no_grad():
        residual_correction = (residual_model(X_tensor).numpy().flatten() * y_std) + y_mean

    return residual_correction, initial_loss, final_loss


def test_2r2c_calibration_positive_params() -> None:
    """
    Verifies that we can load preprocessed heating data, prepare a room-level
    time series, run bounded L-BFGS-B optimization, and retrieve positive parameters.
    """
    model_df, T_in, T_out, Q, dt = _prepare_room_model_data()
    assert not model_df.empty
    assert (model_df["device_count"] >= 1).all()
    assert np.all(model_df["Q_electric_kw"].to_numpy(dtype=float) <= Q)

    best_params, T_fit, objective_value = _fit_room_2r2c(T_in, T_out, Q, dt)

    # Assert optimizer converges (at least to a reasonable threshold)
    assert objective_value < UNSTABLE_OBJECTIVE_PENALTY

    # Assert all 4 parameters (R_in, C_in, R_out, C_wall) are > 0
    assert (best_params > 0).all()

    # Assert RMSE of fitted vs observed is finite and positive
    assert np.all(np.isfinite(T_fit))
    rmse = float(np.sqrt(np.mean((T_fit - T_in) ** 2)))
    assert np.isfinite(rmse)
    assert rmse > 0.0


def test_residual_corrector_improves_room_level_2r2c_fit() -> None:
    """
    Verifies the revised physical-first architecture:
    room-level 2R2C baseline first, then a neural residual corrector that includes
    stateful and electrical-energy features.
    """
    model_df, T_in, T_out, Q, dt = _prepare_room_model_data()
    _, T_fit, _ = _fit_room_2r2c(T_in, T_out, Q, dt)
    residual = T_in - T_fit

    X = _build_residual_features(model_df, T_fit, residual)
    residual_correction, initial_loss, final_loss = _train_residual_corrector(X, residual)

    assert initial_loss is not None
    assert final_loss is not None
    assert np.isfinite(final_loss)
    assert final_loss < initial_loss

    corrected = T_fit + residual_correction
    baseline_rmse = float(np.sqrt(np.mean((T_fit - T_in) ** 2)))
    corrected_rmse = float(np.sqrt(np.mean((corrected - T_in) ** 2)))

    assert len(corrected) == len(T_in)
    assert np.all(np.isfinite(corrected))
    assert corrected_rmse < baseline_rmse


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
