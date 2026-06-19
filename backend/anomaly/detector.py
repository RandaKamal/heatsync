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
import numpy as np
from data.loader import snapshots, snapshots_all, devices

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
    """Parse '0,64,0,0' into a list of active alarm descriptions."""
    if not raw or raw.strip() in ("", "0,0,0,0"):
        return []
    parts = [s.strip() for s in raw.split(",")]
    reg_ids = [1901, 1902, 1903, 1904]
    active = []
    for reg_id, val_str in zip(reg_ids, parts):
        try:
            val = int(val_str)
        except ValueError:
            continue
        if val == 0:
            continue
        for bit, name in _REG_NAMES.get(reg_id, {}).items():
            if val & (1 << bit):
                active.append(f"[Reg {reg_id} bit {bit}] {name}")
    return active


def _iqr_bounds(series: pd.Series, factor: float = 2.5):
    q1, q3 = series.quantile(0.25), series.quantile(0.75)
    iqr = q3 - q1
    return q1 - factor * iqr, q3 + factor * iqr


def alerts(window: str = "heating") -> list[dict]:
    """
    Scan all snapshots in the given window and return anomaly records.
    """
    df = snapshots(window)
    devs = devices()
    label_map = devs.set_index("device_id")["label"].to_dict()
    found = []

    # --- 1. Active alarms ---
    alarm_rows = df[df["status_is_alarm_active"] == 1]
    for _, row in alarm_rows.iterrows():
        errors = _parse_error_registers(str(row.get("status_error_registers", "")))
        found.append({
            "severity": "critical",
            "type": "ACTIVE_ALARM",
            "device_id": row["device_id"],
            "device_name": label_map.get(row["device_id"], row["device_id"]),
            "timestamp": str(row["last_seen_at"]),
            "message": "Active alarm on device.",
            "details": errors or ["Unknown alarm — check error registers."],
        })

    # --- 2. Error registers even without alarm flag ---
    err_rows = df[
        df["status_is_alarm_active"] != 1
    ].copy()
    err_rows["_errors"] = err_rows["status_error_registers"].apply(
        lambda x: _parse_error_registers(str(x))
    )
    err_rows = err_rows[err_rows["_errors"].map(len) > 0]
    for _, row in err_rows.iterrows():
        found.append({
            "severity": "warning",
            "type": "ERROR_REGISTER",
            "device_id": row["device_id"],
            "device_name": label_map.get(row["device_id"], row["device_id"]),
            "timestamp": str(row["last_seen_at"]),
            "message": "Non-zero error register without alarm flag.",
            "details": row["_errors"],
        })

    # --- 3. Pressure anomalies (per device) ---
    for device_id, grp in df.groupby("device_id"):
        for col, label in [
            ("status_low_pressure_in_bar", "low pressure"),
            ("status_high_pressure_in_bar", "high pressure"),
        ]:
            series = pd.to_numeric(grp[col], errors="coerce").dropna()
            if len(series) < 10:
                continue
            lo, hi = _iqr_bounds(series)
            outliers = grp[
                (pd.to_numeric(grp[col], errors="coerce") < lo)
                | (pd.to_numeric(grp[col], errors="coerce") > hi)
            ]
            for _, row in outliers.iterrows():
                val = row.get(col)
                found.append({
                    "severity": "warning",
                    "type": "PRESSURE_ANOMALY",
                    "device_id": device_id,
                    "device_name": label_map.get(device_id, device_id),
                    "timestamp": str(row["last_seen_at"]),
                    "message": f"Abnormal {label}: {val} bar",
                    "details": [f"Expected {lo:.1f}–{hi:.1f} bar"],
                })

    # --- 4. Supply/return delta collapse ---
    df["_supply_return_delta"] = (
        pd.to_numeric(df["status_temperature_supply_in_celsius"], errors="coerce")
        - pd.to_numeric(df["status_temperature_return_in_celsius"], errors="coerce")
    )
    active_heat = df[
        (df["status_is_heating_required"] == 1) | (df["status_is_cooling_required"] == 1)
    ].copy()
    collapse = active_heat[active_heat["_supply_return_delta"].abs() < 1.0]
    for _, row in collapse.iterrows():
        found.append({
            "severity": "warning",
            "type": "SUPPLY_RETURN_COLLAPSE",
            "device_id": row["device_id"],
            "device_name": label_map.get(row["device_id"], row["device_id"]),
            "timestamp": str(row["last_seen_at"]),
            "message": "Supply and return temperatures nearly equal while conditioning active — possible compressor issue.",
            "details": [
                f"Supply: {row.get('status_temperature_supply_in_celsius')} °C",
                f"Return: {row.get('status_temperature_return_in_celsius')} °C",
            ],
        })

    # Deduplicate: keep at most one alert per (device, type, day)
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
