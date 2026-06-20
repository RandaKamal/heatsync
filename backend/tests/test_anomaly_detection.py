import numpy as np
import torch
from notebooks.utils import load_processed
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM
from torch import nn, optim

DETECTOR_COUNT = 3


class SimpleAutoencoder(nn.Module):
    def __init__(self, input_dim: int):
        super().__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32), nn.ReLU(), nn.Linear(32, 16), nn.ReLU()
        )
        self.decoder = nn.Sequential(nn.Linear(16, 32), nn.ReLU(), nn.Linear(32, input_dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.encoder(x)
        x = self.decoder(x)
        return x


def test_anomaly_detection_pipeline() -> None:
    # Set seeds for reproducibility
    np.random.seed(42)
    torch.manual_seed(42)

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
        "status_high_pressure_in_bar",
    ]
    for feat in features:
        assert feat in df.columns

    df_clean = df.dropna(subset=features).copy()
    assert len(df_clean) > 0

    # Scale features
    scaler = StandardScaler()
    X = scaler.fit_transform(df_clean[features])

    # 3. Isolation Forest
    iforest = IsolationForest(contamination=0.05, random_state=42)
    iforest.fit(X)
    df_clean["iforest_flag"] = iforest.predict(X)
    df_clean["iforest_anomaly"] = (df_clean["iforest_flag"] == -1).astype(int)
    assert df_clean["iforest_anomaly"].sum() > 0

    # 4. One-Class SVM
    ocsvm = OneClassSVM(kernel="rbf", nu=0.05)
    ocsvm.fit(X)
    df_clean["ocsvm_flag"] = ocsvm.predict(X)
    df_clean["ocsvm_anomaly"] = (df_clean["ocsvm_flag"] == -1).astype(int)
    assert df_clean["ocsvm_anomaly"].sum() > 0

    # 5. PyTorch Autoencoder
    X_tensor = torch.tensor(X, dtype=torch.float32)
    model = SimpleAutoencoder(input_dim=len(features))
    criterion = nn.MSELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.01)

    # Fast 5 epochs training for testing
    model.train()
    for _ in range(5):
        optimizer.zero_grad()
        outputs = model(X_tensor)
        loss = criterion(outputs, X_tensor)
        loss.backward()
        optimizer.step()

    model.eval()
    with torch.no_grad():
        reconstructed = model(X_tensor)
        mse_per_sample = torch.mean((X_tensor - reconstructed) ** 2, dim=1).numpy()

    df_clean["ae_score"] = mse_per_sample
    ae_threshold = np.mean(mse_per_sample) + 2 * np.std(mse_per_sample)
    df_clean["ae_anomaly"] = (mse_per_sample > ae_threshold).astype(int)

    # Verify anomaly columns exists
    assert "ae_anomaly" in df_clean.columns

    # 6. Combined votes and ranking
    df_clean["detector_votes"] = (
        df_clean["iforest_anomaly"] + df_clean["ocsvm_anomaly"] + df_clean["ae_anomaly"]
    )
    assert df_clean["detector_votes"].max() <= DETECTOR_COUNT
    assert df_clean["detector_votes"].min() >= 0
