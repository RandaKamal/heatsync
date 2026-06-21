import numpy as np
from statsmodels.tsa.statespace.sarimax import SARIMAX

from notebooks.utils import load_processed


def test_sarimax_pipeline_heating() -> None:
    """
    Verifies that we can load preprocessed heating data, prepare a single device's
    time series, split it, and fit a fast SARIMAX model to obtain forecasts.
    """
    df = load_processed("heating")
    assert not df.empty
    assert "device_id" in df.columns
    assert "status_temperature_in_celsius" in df.columns
    assert "outside_temperature" in df.columns

    # Select one device
    device_id = df["device_id"].unique()[0]
    dev_df = df[df["device_id"] == device_id].sort_index().asfreq("15min")
    assert not dev_df.empty
    assert dev_df.index.is_monotonic_increasing

    # Split
    train_size = int(len(dev_df) * 0.8)
    train_df = dev_df.iloc[:train_size]
    test_df = dev_df.iloc[train_size:]

    y_train = train_df["status_temperature_in_celsius"]
    exog_train = train_df["outside_temperature"]
    exog_test = test_df["outside_temperature"]

    # Fit a simple AR(1) model with exogenous variable, very few iterations for speed
    model = SARIMAX(y_train, exog=exog_train, order=(1, 0, 0))
    res = model.fit(disp=False, maxiter=5)

    # Forecast
    forecast = res.get_forecast(steps=len(test_df), exog=exog_test)
    pred = forecast.predicted_mean

    assert len(pred) == len(test_df)
    assert not pred.isna().any()
    assert np.issubdtype(pred.dtype, np.number)
