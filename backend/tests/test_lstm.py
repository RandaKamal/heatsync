import numpy as np
import pytest
import torch
from torch import nn
from torch.utils.data import DataLoader, TensorDataset

from notebooks.utils import load_processed


class LSTMForecaster(nn.Module):
    def __init__(self, input_dim: int, hidden_dim: int = 64, num_layers: int = 1) -> None:
        super().__init__()
        self.lstm = nn.LSTM(input_dim, hidden_dim, num_layers, batch_first=True)
        self.linear = nn.Linear(hidden_dim, 1)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        # x shape: (batch, seq_len, input_dim)
        _, (hn, _) = self.lstm(x)
        # We take the final hidden state of the LSTM sequence from the last layer
        return self.linear(hn[-1]).squeeze(-1)


def create_sequences(
    data: np.ndarray,
    target_idx: int,
    covariate_indices: list[int],
    seq_len: int,
    horizon: int,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    X, y, cov = [], [], []
    L = len(data)
    for i in range(L - seq_len - horizon + 1):
        window = data[i : i + seq_len]
        target = data[i + seq_len + horizon - 1, target_idx]
        cov_val = data[i + seq_len + horizon - 1, covariate_indices]
        X.append(window)
        y.append(target)
        cov.append(cov_val)
    return np.array(X), np.array(y), np.array(cov)


def test_sequence_creation() -> None:
    """
    Tests sequence creation with synthetic data.
    Verifies shapes and edge cases like data shorter than seq_len + horizon.
    """
    np.random.seed(42)
    # create synthetic data with 5 features and 50 timesteps
    data = np.random.randn(50, 5)
    target_idx = 0
    covariate_indices = [1, 2, 3]
    seq_len = 8
    horizon = 2

    X, y, cov = create_sequences(data, target_idx, covariate_indices, seq_len, horizon)
    # Expected number of samples: 50 - 8 - 2 + 1 = 41
    assert X.shape == (41, seq_len, 5)
    assert y.shape == (41,)
    assert cov.shape == (41, len(covariate_indices))

    # Assert edge case: data too short returns empty arrays
    too_short_data = np.random.randn(5, 5)
    X_empty, y_empty, cov_empty = create_sequences(
        too_short_data, target_idx, covariate_indices, seq_len, horizon
    )
    assert len(X_empty) == 0
    assert len(y_empty) == 0
    assert len(cov_empty) == 0


def _get_scaled_heating_data(
    seq_len: int = 8, horizon: int = 1
) -> tuple[
    torch.Tensor,  # X_train_tensor
    torch.Tensor,  # y_train_scaled
    torch.Tensor,  # X_test_tensor
    np.ndarray,  # y_test
    np.ndarray,  # y_train
    float,  # y_mean
    float,  # y_std
    torch.Tensor,  # cov_train_tensor
    torch.Tensor,  # cov_test_tensor
]:
    df_heating_raw = load_processed("heating")
    assert not df_heating_raw.empty

    devices = df_heating_raw["device_id"].unique()
    target_device = devices[0]
    df_heating = df_heating_raw[df_heating_raw["device_id"] == target_device].sort_index()
    df_heating = df_heating.asfreq("15min")

    target_col = "status_temperature_in_celsius"
    covariates_l2 = ["outside_temperature", "occupancy_flag", "hour_of_day"]
    all_cols = [
        target_col,
        "outside_temperature",
        "occupancy_flag",
        "hour_of_day",
        "day_of_week",
        "is_weekend",
    ]

    # Fill NA values
    df_heating_filled = df_heating[all_cols].ffill().fillna(0.0)
    data_array = df_heating_filled.values

    target_idx = df_heating_filled.columns.get_loc(target_col)
    covariate_indices = [df_heating_filled.columns.get_loc(c) for c in covariates_l2]

    X, y, cov = create_sequences(data_array, target_idx, covariate_indices, seq_len, horizon)

    min_samples = 10
    assert len(X) > min_samples

    # Split
    train_size = int(len(X) * 0.8)
    X_train, X_test = X[:train_size], X[train_size:]
    y_train, y_test = y[:train_size], y[train_size:]
    cov_train, cov_test = cov[:train_size], cov[train_size:]

    # Scale using training stats
    mean = X_train.mean(axis=(0, 1))
    std = X_train.std(axis=(0, 1))
    std = np.where(std == 0, 1.0, std)

    X_train_scaled = (X_train - mean) / std
    X_test_scaled = (X_test - mean) / std

    y_mean = mean[target_idx]
    y_std = std[target_idx]

    y_train_scaled = (y_train - y_mean) / y_std

    cov_mean = mean[covariate_indices]
    cov_std = std[covariate_indices]
    cov_std = np.where(cov_std == 0, 1.0, cov_std)

    cov_train_scaled = (cov_train - cov_mean) / cov_std
    cov_test_scaled = (cov_test - cov_mean) / cov_std

    return (
        torch.FloatTensor(X_train_scaled),
        torch.FloatTensor(y_train_scaled),
        torch.FloatTensor(X_test_scaled),
        y_test,
        y_train,
        float(y_mean),
        float(y_std),
        torch.FloatTensor(cov_train_scaled),
        torch.FloatTensor(cov_test_scaled),
    )


def test_lstm_pipeline_heating() -> None:
    """
    Loads processed heating data, selects the first device, prepares sequences,
    trains a minimal L1 LSTM model, and checks that prediction predictions are finite and positive.
    """
    np.random.seed(42)
    torch.manual_seed(42)

    (
        X_train_tensor,
        y_train_tensor,
        X_test_tensor,
        y_test,
        _,
        y_mean,
        y_std,
        _,
        _,
    ) = _get_scaled_heating_data()

    # Train minimal LSTM
    model_l1 = LSTMForecaster(input_dim=X_train_tensor.shape[2], hidden_dim=16, num_layers=1)
    criterion_l1 = nn.MSELoss()
    optimizer_l1 = torch.optim.Adam(model_l1.parameters(), lr=1e-2)

    dataset = TensorDataset(X_train_tensor, y_train_tensor)
    loader = DataLoader(dataset, batch_size=32, shuffle=False)

    model_l1.train()
    for _ in range(5):
        for batch_X, batch_y in loader:
            optimizer_l1.zero_grad()
            preds = model_l1(batch_X)
            loss = criterion_l1(preds, batch_y)
            loss.backward()
            optimizer_l1.step()

    # Predict
    model_l1.eval()
    with torch.no_grad():
        y_pred_l1_scaled = model_l1(X_test_tensor).numpy()

    y_pred_l1 = y_pred_l1_scaled * y_std + y_mean

    assert len(y_pred_l1) == len(y_test)
    assert np.all(np.isfinite(y_pred_l1))

    # Evaluate RMSE
    rmse = np.float64(np.sqrt(np.mean((y_test - y_pred_l1) ** 2)))
    assert rmse > 0.0
    assert np.isfinite(rmse)


def test_lstm_residual_correction() -> None:
    """
    Fits L1 model, computes residuals, fits L2 feedforward model on covariates,
    and checks combined forecast.
    """
    np.random.seed(42)
    torch.manual_seed(42)

    (
        X_train_tensor,
        y_train_tensor,
        X_test_tensor,
        y_test,
        y_train,
        y_mean,
        y_std,
        cov_train_tensor,
        cov_test_tensor,
    ) = _get_scaled_heating_data()

    # Fit L1 model (5 epochs)
    model_l1 = LSTMForecaster(input_dim=X_train_tensor.shape[2], hidden_dim=16, num_layers=1)
    criterion_l1 = nn.MSELoss()
    optimizer_l1 = torch.optim.Adam(model_l1.parameters(), lr=1e-2)

    dataset_l1 = TensorDataset(X_train_tensor, y_train_tensor)
    loader_l1 = DataLoader(dataset_l1, batch_size=32, shuffle=False)

    model_l1.train()
    for _ in range(5):
        for batch_X, batch_y in loader_l1:
            optimizer_l1.zero_grad()
            preds = model_l1(batch_X)
            loss = criterion_l1(preds, batch_y)
            loss.backward()
            optimizer_l1.step()

    model_l1.eval()
    with torch.no_grad():
        y_pred_l1_train = (model_l1(X_train_tensor).numpy() * y_std) + y_mean
        y_pred_l1_test = (model_l1(X_test_tensor).numpy() * y_std) + y_mean

    # Compute residuals
    r_train = y_train - y_pred_l1_train

    # Fit L2 corrector (5 epochs)
    model_l2 = nn.Sequential(
        nn.Linear(cov_train_tensor.shape[1], 16),
        nn.ReLU(),
        nn.Linear(16, 1),
    )
    criterion_l2 = nn.MSELoss()
    optimizer_l2 = torch.optim.Adam(model_l2.parameters(), lr=1e-2)

    r_train_tensor = torch.FloatTensor(r_train)
    dataset_l2 = TensorDataset(cov_train_tensor, r_train_tensor)
    loader_l2 = DataLoader(dataset_l2, batch_size=32, shuffle=False)

    model_l2.train()
    for _ in range(5):
        for batch_cov, batch_r in loader_l2:
            optimizer_l2.zero_grad()
            preds = model_l2(batch_cov).squeeze(-1)
            loss = criterion_l2(preds, batch_r)
            loss.backward()
            optimizer_l2.step()

    # Predict residual correction
    model_l2.eval()
    with torch.no_grad():
        l2_correction_test = model_l2(cov_test_tensor).squeeze(-1).numpy()

    y_pred_combined = y_pred_l1_test + l2_correction_test

    assert len(l2_correction_test) == len(y_test)
    assert np.all(np.isfinite(l2_correction_test))
    assert np.all(np.isfinite(y_pred_combined))

    combined_rmse = np.float64(np.sqrt(np.mean((y_test - y_pred_combined) ** 2)))
    assert combined_rmse > 0.0
    assert np.isfinite(combined_rmse)


def test_sequence_creation_invalid_inputs() -> None:
    """
    Tests negative/edge-case inputs for sequence creation, verifying they raise IndexError.
    """
    data = np.random.randn(10, 3)
    # Target index out of bounds
    with pytest.raises(IndexError):
        create_sequences(
            data, target_idx=5, covariate_indices=[1], seq_len=5, horizon=1
        )

    # Covariate index out of bounds
    with pytest.raises(IndexError):
        create_sequences(
            data, target_idx=0, covariate_indices=[5], seq_len=5, horizon=1
        )

