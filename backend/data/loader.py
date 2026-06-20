from datetime import UTC, datetime, timedelta

import pandas as pd

_DEVICE_ROWS = [
    {
        "device_id": "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",
        "label": "Device 1",
        "type": "DEVICE_HEAT_PUMP",
        "hardware_version": "synthetic",
    },
    {
        "device_id": "1c893f75-4599-4402-9d4c-1017aa858fa8",
        "label": "Device 2",
        "type": "DEVICE_HEAT_PUMP",
        "hardware_version": "synthetic",
    },
    {
        "device_id": "e72fea56-abe7-4d3f-a0ed-1e6b6c462157",
        "label": "Device 3",
        "type": "DEVICE_HEAT_PUMP",
        "hardware_version": "synthetic",
    },
    {
        "device_id": "930f3621-05df-4574-9270-9d994c5b716c",
        "label": "Device 4",
        "type": "DEVICE_HEAT_PUMP",
        "hardware_version": "synthetic",
    },
]

_WINDOW_STARTS = {
    "heating": datetime(2026, 3, 30, tzinfo=UTC),
    "cooling": datetime(2026, 5, 25, tzinfo=UTC),
}

_SAMPLE_COUNT = 12
_POWER_INTERVAL_MINUTES = 5
_INTERVAL_MINUTES = 15
_CONDITIONING_START_SAMPLE = 6
_ADJUSTING_START_SAMPLE = 3
_SPACE_ID = "3dbed10b-9e88-4163-916d-3182e2ecc69f"


def _window_start(window: str) -> datetime:
    try:
        return _WINDOW_STARTS[window]
    except KeyError as exc:
        valid = ", ".join(sorted(_WINDOW_STARTS))
        raise ValueError(f"Unknown window '{window}'. Expected one of: {valid}.") from exc


def _with_window(rows: list[dict], window: str) -> pd.DataFrame:
    df = pd.DataFrame(rows)
    df["window"] = window
    return df


def devices() -> pd.DataFrame:
    return pd.DataFrame(_DEVICE_ROWS)


def snapshots(window: str = "heating") -> pd.DataFrame:
    start = _window_start(window)
    operation_mode = "HEAT" if window == "heating" else "COOL"
    rows = []
    for device_index, device in enumerate(_DEVICE_ROWS):
        for sample_index in range(_SAMPLE_COUNT):
            rows.append(
                _create_snapshot(window, start, operation_mode, device_index, device, sample_index)
            )
    return _with_window(rows, window)


def _create_snapshot(
    window: str,
    start: datetime,
    operation_mode: str,
    device_index: int,
    device: dict,
    sample_index: int,
) -> dict:
    timestamp = start + timedelta(minutes=_INTERVAL_MINUTES * sample_index)
    temperature = 18.5 + sample_index * 0.2
    if window == "cooling":
        temperature = 24.5 - sample_index * 0.15
    return {
        "id": f"{window}-{device_index}-{sample_index}",
        "device_id": device["device_id"],
        "space_id": _SPACE_ID,
        "last_seen_at": timestamp,
        "status_is_enabled": 1,
        "status_operation_mode": operation_mode,
        "status_target_temperature_in_celsius": 21.0,
        "status_temperature_in_celsius": round(temperature, 2),
        "status_humidity_in_percent": 45.0 + device_index,
        "status_carbon_dioxide_in_ppm": 440 + sample_index,
        "status_voc_in_micrograms_per_cubic_meter": 120 + device_index,
        "status_temperature_supply_in_celsius": 22.0 + sample_index * 0.1,
        "status_temperature_return_in_celsius": 18.0 + sample_index * 0.05,
        "status_temperature_outside_in_celsius": (5.0 if window == "heating" else 28.0),
        "status_air_flow_supply_in_percent": 40,
        "status_air_flow_return_in_percent": 40,
        "status_is_heating_required": int(
            window == "heating" and sample_index >= _CONDITIONING_START_SAMPLE
        ),
        "status_is_cooling_required": int(
            window == "cooling" and sample_index >= _CONDITIONING_START_SAMPLE
        ),
        "status_heat_threshold_in_celsius": 19.0,
        "status_cool_threshold_in_celsius": 24.0,
        "status_is_compressor_active": int(sample_index >= _CONDITIONING_START_SAMPLE),
        "status_is_defrost_active": 0,
        "status_low_pressure_in_bar": 6.8 + device_index * 0.1,
        "status_high_pressure_in_bar": 10.0 + device_index * 0.2,
        "status_daily_shutdown_is_active": 0,
        "status_daily_shutdown_temperature_in_celsius": 18.0,
        "status_daily_shutdown_air_flow_supply_in_percent": 40,
        "status_daily_shutdown_air_flow_return_in_percent": 40,
        "status_is_status_active": 1,
        "status_is_alarm_active": 0,
        "status_error_registers": "0,0,0,0",
        "status_is_network_connected": 1,
        "status_has_network_error": 0,
        "status_network_error_count": 0,
        "status_system_uptime_in_seconds": 1_000_000 + sample_index,
        "firmware_version": "synthetic",
        "payload_version": 1,
    }


def snapshots_all() -> pd.DataFrame:
    return pd.concat([snapshots(window) for window in _WINDOW_STARTS], ignore_index=True)


def power_draw(window: str = "heating") -> pd.DataFrame:
    start = _window_start(window)
    rows = []
    for device_index, device in enumerate(_DEVICE_ROWS):
        for sample_index in range(_SAMPLE_COUNT):
            base_kw = 1.2 + device_index * 0.2
            if window == "cooling":
                base_kw += 0.3
            rows.append(
                {
                    "device_id": device["device_id"],
                    "device_name": device["label"],
                    "timestamp": start + timedelta(minutes=_POWER_INTERVAL_MINUTES * sample_index),
                    "power_draw_kw": round(base_kw + sample_index * 0.03, 3),
                }
            )
    return _with_window(rows, window)


def power_draw_all() -> pd.DataFrame:
    return pd.concat([power_draw(window) for window in _WINDOW_STARTS], ignore_index=True)


def intervals(window: str = "heating") -> pd.DataFrame:
    start = _window_start(window)
    operation_mode = "HEAT" if window == "heating" else "COOL"
    rows = []
    for device_index, device in enumerate(_DEVICE_ROWS):
        for sample_index in range(_SAMPLE_COUNT):
            interval_start = start + timedelta(minutes=_INTERVAL_MINUTES * sample_index)
            interval_end = interval_start + timedelta(minutes=_INTERVAL_MINUTES)
            target = 21.0 if window == "heating" else 23.0
            median = target - 2.0 + sample_index * 0.1
            if window == "cooling":
                median = target + 2.0 - sample_index * 0.1
            rows.append(
                {
                    "device_id": device["device_id"],
                    "space_uuid": _SPACE_ID,
                    "interval_start_time": interval_start,
                    "interval_end_time": interval_end,
                    "start": interval_start,
                    "end": interval_end,
                    "time_range": "FIFTEEN_MINUTES",
                    "operation_mode": operation_mode,
                    "was_adjusting_temperature": int(sample_index >= _ADJUSTING_START_SAMPLE),
                    "target_temperature_in_celsius": target,
                    "median_temperature_in_celsius": round(median, 2),
                    "median_return_temperature_in_celsius": round(median - 0.5, 2),
                    "median_humidity_in_percent": 45.0,
                    "median_carbon_dioxide_in_ppm": 450,
                    "low_pressure_highest_in_bar": 6.8 + device_index * 0.1,
                    "high_pressure_highest_in_bar": 10.0 + device_index * 0.2,
                }
            )
    return _with_window(rows, window)


def intervals_all() -> pd.DataFrame:
    return pd.concat([intervals(window) for window in _WINDOW_STARTS], ignore_index=True)


def space_events(window: str = "heating") -> pd.DataFrame:
    start = _window_start(window)
    rows = [
        {
            "name": "Synthetic lecture",
            "event_name": "Synthetic lecture",
            "type": "SINGLETON",
            "source": "SYNTHETIC",
            "starts_at": start + timedelta(hours=4),
            "ends_at": start + timedelta(hours=8),
        },
        {
            "name": "Synthetic lab",
            "event_name": "Synthetic lab",
            "type": "SINGLETON",
            "source": "SYNTHETIC",
            "starts_at": start + timedelta(hours=10),
            "ends_at": start + timedelta(hours=12),
        },
    ]
    return _with_window(rows, window)
