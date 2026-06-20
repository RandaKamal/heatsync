import pandas as pd
from datetime import datetime, timedelta

def devices():
    try:
        df = pd.read_csv("backend/data/devices.csv")
    except FileNotFoundError:
        df = pd.DataFrame([
            {"device_id": "ORION-01", "name": "Device 1", "type": "DEVICE_HEAT_PUMP"},
            {"device_id": "ORION-02", "name": "Device 2", "type": "DEVICE_HEAT_PUMP"},
        ])
    return df

def snapshots(window="heating"):
    now = datetime.now()
    return pd.DataFrame([
        {
            "device_id": "ORION-01",
            "last_seen_at": now,
            "status_temperature_in_celsius": 21.5,
            "status_humidity_in_percent": 45.0
        },
        {
            "device_id": "ORION-02",
            "last_seen_at": now,
            "status_temperature_in_celsius": 19.8,
            "status_humidity_in_percent": 50.0
        }
    ])

def snapshots_all():
    return snapshots()

def power_draw(window="heating"):
    now = datetime.now()
    return pd.DataFrame([
        {"device_id": "ORION-01", "timestamp": now - timedelta(hours=1), "power_draw_kw": 5.2},
        {"device_id": "ORION-01", "timestamp": now, "power_draw_kw": 5.5},
        {"device_id": "ORION-02", "timestamp": now - timedelta(hours=1), "power_draw_kw": 4.1},
        {"device_id": "ORION-02", "timestamp": now, "power_draw_kw": 4.2},
    ])

def power_draw_all():
    return power_draw()

def intervals(window="heating"):
    # Often intervals is just a resampled or processed dataset. We'll return an empty DataFrame or one with basic structure.
    return pd.DataFrame([
        {"device_id": "ORION-01", "start": datetime.now(), "end": datetime.now() + timedelta(hours=1)}
    ])

def intervals_all():
    return intervals()

def space_events(window="heating"):
    now = datetime.now()
    return pd.DataFrame([
        {"starts_at": now, "ends_at": now + timedelta(hours=2), "event_name": "Meeting"}
    ])
