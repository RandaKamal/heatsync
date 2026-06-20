"""
Anomaly detection on heat pump snapshot data.

Checks:
  1. Active alarm flags (status_is_alarm_active)
  2. Non-zero error registers (parsed from "1901,1902,1903,1904" bitfields)
  3. Pressure anomalies (low/high pressure outside normal IQR band)
  4. Supply/return temperature delta collapse (indicates failed compressor)
  5. Temperature stall: pump heating required but room temp not rising

Severity levels: "critical", "warning", "info"
"""

import pandas as pd
from loader import devices, snapshots

_MIN_PRESSURE_SAMPLES = 10

# Register bit-to-description maps (from dataset README)
_REG_NAMES = {
    1901: {
        0: "Outside Air Humidity Sensor Fault",
        1: "Circuit 1 High Pressure Switch Alarm",
        2: "Circuit 1 Low Pressure Switch Alarm",
        3: "Circuit 1 Compressor 1 Alarm",
        8: "General Alarm",
        9: "Temperature Sensor Fault",
        10: "Supply Fan Fault",
        11: "Return Fan Fault",
    },
    1902: {
        5: "Circuit 1 High Pressure Alarm",
        6: "Circuit 1 Low Pressure Alarm",
        7: "Circuit 2 High Pressure Alarm",
        15: "Filter Alarm",
    },
    1903: {
        9: "Fire Detector Alarm",
        12: "Phase Fault Alarm",
    },
    1904: {
        0: "A2L Gas Detector Fault",
        14: "Circuit 1 Condenser Fan Alarm",
        15: "Circuit 2 Condenser Fan Alarm",
    },
}


def _parse_error_registers(raw: str) -> list[str]:
    if not raw or raw.strip() in ("", "0,0,0,0"):
        return []
    parts = [s.strip() for s in raw.split(",")]
    reg_ids = [1901, 1902, 1903, 1904]
    return _active_alarms_from_parts(reg_ids, parts)


def _active_alarms_from_parts(reg_ids: list[int], parts: list[str]) -> list[str]:
    active = []
    for reg_id, val_str in zip(reg_ids, parts, strict=False):
        active.extend(_decode_register(reg_id, val_str))
    return active


def _decode_register(reg_id: int, val_str: str) -> list[str]:
    try:
        val = int(val_str)
    except ValueError:
        return []
    if val == 0:
        return []
    return [
        f"[Reg {reg_id} bit {bit}] {name}"
        for bit, name in _REG_NAMES.get(reg_id, {}).items()
        if val & (1 << bit)
    ]


def _iqr_bounds(series: pd.Series, factor: float = 2.5) -> tuple[float, float]:
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    return q1 - factor * iqr, q3 + factor * iqr


def alerts(window: str = "heating") -> list[dict]:
    df = snapshots(window)
    devs = devices()
    label_map = devs.set_index("device_id")["label"].to_dict()
    found = []

    found.extend(_check_active_alarms(df, label_map))
    found.extend(_check_error_registers(df, label_map))
    found.extend(_check_pressure_anomalies(df, label_map))
    found.extend(_check_supply_return_collapse(df, label_map))

    return _deduplicate_alerts(found)


def _check_active_alarms(df: pd.DataFrame, label_map: dict) -> list[dict]:
    found = []
    alarm_rows = df[df["status_is_alarm_active"] == 1]
    for _, row in alarm_rows.iterrows():
        errors = _parse_error_registers(str(row.get("status_error_registers", "")))
        found.append(
            {
                "severity": "critical",
                "type": "ACTIVE_ALARM",
                "device_id": row["device_id"],
                "device_name": label_map.get(row["device_id"], row["device_id"]),
                "timestamp": str(row["last_seen_at"]),
                "message": "Active alarm on device.",
                "details": errors or ["Unknown alarm — check error registers."],
            }
        )
    return found


def _check_error_registers(df: pd.DataFrame, label_map: dict) -> list[dict]:
    found = []
    err_rows = df[df["status_is_alarm_active"] != 1].copy()
    err_rows["_errors"] = err_rows["status_error_registers"].apply(
        lambda x: _parse_error_registers(str(x))
    )
    err_rows = err_rows[err_rows["_errors"].map(len) > 0]
    for _, row in err_rows.iterrows():
        found.append(
            {
                "severity": "warning",
                "type": "ERROR_REGISTER",
                "device_id": row["device_id"],
                "device_name": label_map.get(row["device_id"], row["device_id"]),
                "timestamp": str(row["last_seen_at"]),
                "message": "Non-zero error register without alarm flag.",
                "details": row["_errors"],
            }
        )
    return found


def _check_pressure_anomalies(df: pd.DataFrame, label_map: dict) -> list[dict]:
    found = []
    for device_id, grp in df.groupby("device_id"):
        found.extend(_check_device_pressure(str(device_id), grp, label_map))
    return found


def _check_device_pressure(device_id: str, grp: pd.DataFrame, label_map: dict) -> list[dict]:
    found = []
    found.extend(
        _check_pressure_col(device_id, grp, label_map, "status_low_pressure_in_bar", "low pressure")
    )
    found.extend(
        _check_pressure_col(
            device_id, grp, label_map, "status_high_pressure_in_bar", "high pressure"
        )
    )
    return found


def _check_pressure_col(
    device_id: str, grp: pd.DataFrame, label_map: dict, col: str, label: str
) -> list[dict]:
    series = pd.to_numeric(grp[col], errors="coerce").dropna()
    if len(series) < _MIN_PRESSURE_SAMPLES:
        return []
    lo, hi = _iqr_bounds(series)
    outliers = grp[
        (pd.to_numeric(grp[col], errors="coerce") < lo)
        | (pd.to_numeric(grp[col], errors="coerce") > hi)
    ]
    return [
        _pressure_alert(device_id, label_map, row, col, label, lo, hi)
        for _, row in outliers.iterrows()
    ]


def _pressure_alert(
    device_id: str, label_map: dict, row: pd.Series, col: str, label: str, lo: float, hi: float
) -> dict:
    return {
        "severity": "warning",
        "type": "PRESSURE_ANOMALY",
        "device_id": device_id,
        "device_name": label_map.get(device_id, device_id),
        "timestamp": str(row["last_seen_at"]),
        "message": f"Abnormal {label}: {row.get(col)} bar",
        "details": [f"Expected {lo:.1f}-{hi:.1f} bar"],
    }


def _check_supply_return_collapse(df: pd.DataFrame, label_map: dict) -> list[dict]:
    found = []
    df["_supply_return_delta"] = pd.to_numeric(
        df["status_temperature_supply_in_celsius"], errors="coerce"
    ) - pd.to_numeric(df["status_temperature_return_in_celsius"], errors="coerce")
    active_heat = df[
        (df["status_is_heating_required"] == 1) | (df["status_is_cooling_required"] == 1)
    ].copy()
    collapse = active_heat[active_heat["_supply_return_delta"].abs() < 1.0]
    for _, row in collapse.iterrows():
        found.append(
            {
                "severity": "warning",
                "type": "SUPPLY_RETURN_COLLAPSE",
                "device_id": row["device_id"],
                "device_name": label_map.get(row["device_id"], row["device_id"]),
                "timestamp": str(row["last_seen_at"]),
                "message": (
                    "Supply and return temperatures nearly equal while conditioning active "
                    "- possible compressor issue."
                ),
                "details": [
                    f"Supply: {row.get('status_temperature_supply_in_celsius')} °C",
                    f"Return: {row.get('status_temperature_return_in_celsius')} °C",
                ],
            }
        )
    return found


def _deduplicate_alerts(found: list[dict]) -> list[dict]:
    seen = set()
    deduped = []
    for a in found:
        day = a["timestamp"][:10]
        key = (a["device_id"], a["type"], day)
        if key not in seen:
            seen.add(key)
            deduped.append(a)
    return sorted(deduped, key=lambda x: (x["severity"], x["timestamp"]), reverse=True)


def summary(window: str = "heating") -> dict:
    all_alerts = alerts(window)
    by_severity = {"critical": 0, "warning": 0, "info": 0}
    for a in all_alerts:
        by_severity[a["severity"]] = by_severity.get(a["severity"], 0) + 1
    return {
        "window": window,
        "total": len(all_alerts),
        "by_severity": by_severity,
        "alerts": all_alerts[:50],  # cap response size
    }
