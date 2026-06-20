import os
import sys

import nbformat  # type: ignore[import-untyped]
import numpy as np
import pandas as pd
import torch
from nbconvert.preprocessors import ExecutePreprocessor  # type: ignore[import-untyped]
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM
from torch import nn, optim

# Ensure the backend directory is in the path
backend_path = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from notebooks.utils import load_processed  # noqa: E402


class Autoencoder(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.ReLU(),
            nn.Linear(32, 16),
            nn.ReLU()
        )
        self.decoder = nn.Sequential(
            nn.Linear(16, 32),
            nn.ReLU(),
            nn.Linear(32, input_dim)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.encoder(x)
        x = self.decoder(x)
        return x


def parse_error_registers(err_str: str) -> bool:
    if not isinstance(err_str, str):
        return False
    try:
        parts = [int(p) for p in err_str.split(',')]
        return any(p != 0 for p in parts)
    except Exception:
        return False


def test_isolation_forest() -> None:
    # 1. Load data
    df = load_processed("heating")
    assert not df.empty
    
    # 2. Select features
    features = [
        "status_temperature_in_celsius", 
        "status_temperature_supply_in_celsius", 
        "status_temperature_return_in_celsius", 
        "status_temperature_outside_in_celsius",
        "power_draw_kw", 
        "status_is_compressor_active", 
        "status_air_flow_supply_in_percent",
        "status_low_pressure_in_bar", 
        "status_high_pressure_in_bar"
    ]
    for feat in features:
        assert feat in df.columns
        
    df_clean = df.dropna(subset=features).copy()
    assert len(df_clean) > 0
    
    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(df_clean[features])
    
    # Fit Isolation Forest
    iforest = IsolationForest(contamination=0.05, random_state=42)
    iforest.fit(X)
    
    predictions = iforest.predict(X)
    # Assert predictions contain both -1 (anomaly) and 1 (normal) labels
    unique_preds = np.unique(predictions)
    assert -1 in unique_preds
    assert 1 in unique_preds
    
    # Assert anomaly count is > 0 and < total sample count
    anomaly_count = np.sum(predictions == -1)
    assert anomaly_count > 0
    assert anomaly_count < len(X)
    
    # Assert decision_function returns finite float scores
    scores = iforest.decision_function(X)
    assert np.all(np.isfinite(scores))
    assert scores.dtype in (np.float64, np.float32)


def test_one_class_svm() -> None:
    # 1. Load data
    df = load_processed("heating")
    features = [
        "status_temperature_in_celsius", 
        "status_temperature_supply_in_celsius", 
        "status_temperature_return_in_celsius", 
        "status_temperature_outside_in_celsius",
        "power_draw_kw", 
        "status_is_compressor_active", 
        "status_air_flow_supply_in_percent",
        "status_low_pressure_in_bar", 
        "status_high_pressure_in_bar"
    ]
    df_clean = df.dropna(subset=features).copy()
    scaler = StandardScaler()
    X = scaler.fit_transform(df_clean[features])
    
    # Fit One-Class SVM
    ocsvm = OneClassSVM(kernel="rbf", nu=0.05)
    ocsvm.fit(X)
    
    predictions = ocsvm.predict(X)
    # Assert predictions contain both -1 and 1 labels
    unique_preds = np.unique(predictions)
    assert -1 in unique_preds
    assert 1 in unique_preds
    
    # Assert anomaly count is > 0 and < total sample count
    anomaly_count = np.sum(predictions == -1)
    assert anomaly_count > 0
    assert anomaly_count < len(X)
    
    # Assert decision_function returns finite float scores
    scores = ocsvm.decision_function(X)
    assert np.all(np.isfinite(scores))
    assert scores.dtype in (np.float64, np.float32)


def test_pytorch_autoencoder() -> None:
    # 1. Load data
    df = load_processed("heating")
    features = [
        "status_temperature_in_celsius", 
        "status_temperature_supply_in_celsius", 
        "status_temperature_return_in_celsius", 
        "status_temperature_outside_in_celsius",
        "power_draw_kw", 
        "status_is_compressor_active", 
        "status_air_flow_supply_in_percent",
        "status_low_pressure_in_bar", 
        "status_high_pressure_in_bar"
    ]
    df_clean = df.dropna(subset=features).copy()
    scaler = StandardScaler()
    X = scaler.fit_transform(df_clean[features])
    
    # Define PyTorch Autoencoder detector
    torch.manual_seed(42)
    input_dim = len(features)
    model = Autoencoder(input_dim)
    
    # Assert the model's output dimension matches input dimension
    test_input = torch.randn(5, input_dim)
    test_output = model(test_input)
    assert test_output.shape == test_input.shape
    
    # Convert data to PyTorch Tensors
    X_tensor = torch.tensor(X, dtype=torch.float32)
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.005)
    
    # Train for 50 epochs with MSE loss, Adam optimizer, batch_size=64, torch.manual_seed(42)
    epochs = 50
    batch_size = 64
    dataset = torch.utils.data.TensorDataset(X_tensor)
    dataloader = torch.utils.data.DataLoader(dataset, batch_size=batch_size, shuffle=True)
    
    model.train()
    for _ in range(epochs):
        for batch in dataloader:
            inputs = batch[0]
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, inputs)
            loss.backward()
            optimizer.step()
            
    model.eval()
    with torch.no_grad():
        reconstructed = model(X_tensor)
        # Compute per-sample reconstruction error
        mse_per_sample = torch.mean((X_tensor - reconstructed) ** 2, dim=1).numpy()
        
    # Assert reconstruction errors are all finite and non-negative
    assert np.all(np.isfinite(mse_per_sample))
    assert np.all(mse_per_sample >= 0.0)
    
    # Assert threshold-based anomaly count (mean + 2*std) is > 0
    ae_threshold = np.mean(mse_per_sample) + 2 * np.std(mse_per_sample)
    anomaly_count = np.sum(mse_per_sample > ae_threshold)
    assert anomaly_count > 0


def test_modbus_error_register_parsing() -> None:
    # Assert that parsing '0,64,0,0' produces has_modbus_error=True
    assert parse_error_registers("0,64,0,0") is True
    
    # Assert that parsing '0,0,0,0' produces has_modbus_error=False
    assert parse_error_registers("0,0,0,0") is False
    
    # Load processed data and assert error register column exists
    df = load_processed("heating")
    assert "status_error_registers" in df.columns


def test_combined_ranking() -> None:
    # Create mock detector outputs
    # 5 samples:
    # Sample 0: votes=3 (iforest=1, ocsvm=1, ae=1), high scores
    # Sample 1: votes=2, high scores
    # Sample 2: votes=2, low scores
    # Sample 3: votes=1, high scores
    # Sample 4: votes=0, low scores
    
    df_mock = pd.DataFrame({
        "iforest_anomaly": [1, 1, 1, 1, 0],
        "ocsvm_anomaly":   [1, 1, 1, 0, 0],
        "ae_anomaly":      [1, 0, 0, 0, 0],
        "iforest_score":   [-0.5, -0.4, -0.1, -0.2, 0.1],
        "ocsvm_score":     [-0.5, -0.4, -0.1, -0.2, 0.1],
        "ae_score":        [1.5, 1.2, 0.2, 0.5, 0.1]
    })
    
    # Compute total votes
    df_mock["detector_votes"] = (
        df_mock["iforest_anomaly"] + 
        df_mock["ocsvm_anomaly"] + 
        df_mock["ae_anomaly"]
    )
    
    # Verify vote counting produces correct [0-3] range
    max_possible_votes = 3
    assert df_mock["detector_votes"].min() >= 0
    assert df_mock["detector_votes"].max() <= max_possible_votes
    
    # Normalize scores to [0, 1] range (average of the three normalized indicators)
    if_min, if_max = df_mock["iforest_score"].min(), df_mock["iforest_score"].max()
    df_mock["iforest_norm"] = 1.0 - (df_mock["iforest_score"] - if_min) / (if_max - if_min + 1e-8)
    
    svm_min, svm_max = df_mock["ocsvm_score"].min(), df_mock["ocsvm_score"].max()
    df_mock["ocsvm_norm"] = 1.0 - (df_mock["ocsvm_score"] - svm_min) / (svm_max - svm_min + 1e-8)
    
    ae_min, ae_max = df_mock["ae_score"].min(), df_mock["ae_score"].max()
    df_mock["ae_norm"] = (df_mock["ae_score"] - ae_min) / (ae_max - ae_min + 1e-8)
    
    num_detectors = 3.0
    df_mock["combined_score"] = (
        df_mock["iforest_norm"] + df_mock["ocsvm_norm"] + df_mock["ae_norm"]
    ) / num_detectors
    
    # Verify ranking sorts by votes descending, then by score descending
    shortlist = df_mock.sort_values(
        by=["detector_votes", "combined_score"], 
        ascending=[False, False]
    )
    
    votes = shortlist["detector_votes"].to_list()
    # Check votes are descending
    for i in range(len(votes) - 1):
        assert votes[i] >= votes[i+1]
        
    # Verify index ordering based on scores/votes
    rank_order = shortlist.index.to_list()
    assert rank_order[:3] == [0, 1, 2]


def test_notebook_execution() -> None:
    # Execute 05_anomaly_detection.ipynb via nbconvert programmatically
    notebook_path = "backend/notebooks/05_anomaly_detection.ipynb"
    assert os.path.exists(notebook_path), f"Notebook not found at: {notebook_path}"
    
    with open(notebook_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)
        
    ep = ExecutePreprocessor(timeout=300, kernel_name="python3")
    ep.preprocess(nb, {"metadata": {"path": "backend/notebooks"}})
    
    # Assert notebook has output cells (not empty)
    code_cells = [cell for cell in nb.cells if cell.cell_type == "code"]
    assert len(code_cells) > 0
    
    has_outputs = False
    for cell in code_cells:
        if len(cell.get("outputs", [])) > 0:
            has_outputs = True
            break
    assert has_outputs, "Notebook executed but no cells had output"
