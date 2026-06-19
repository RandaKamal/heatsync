"""
Energy, cost, and CO2 impact calculations.

Baseline model:
  The LBenergy PDF states IHL reduces consumption by 20-30% vs continuous
  manual operation. We use 25% (midpoint) as the savings factor applied to
  measured actual consumption, giving: baseline = actual / 0.75.

  For per-device and per-window details we also report the actual measured
  energy from power_draw.csv.

Rates (Germany 2024-2026):
  Electricity price : 0.25 €/kWh  (large commercial / campus tariff)
  CO2 intensity     : 0.380 kg CO2/kWh  (Umweltbundesamt 2024 grid mix)
"""

import pandas as pd
from data.loader import power_draw, power_draw_all, devices, intervals

ELECTRICITY_PRICE_EUR_PER_KWH = 0.25
CO2_KG_PER_KWH = 0.380
INTERVAL_HOURS = 5 / 60          # power_draw sampled every 5 minutes
IHL_SAVINGS_FACTOR = 0.25        # 25 % savings midpoint from PDF (20–30 %)


def _energy_kwh(df: pd.DataFrame) -> float:
    """Measured energy over 5-minute intervals (kWh)."""
    return float(df["power_draw_kw"].sum() * INTERVAL_HOURS)


def _baseline_kwh(actual_kwh: float) -> float:
    """
    Naive baseline: what a continuous, non-optimised system would have used.
    Derived from the IHL benchmark: actual = baseline * (1 - savings_factor).
    """
    return actual_kwh / (1.0 - IHL_SAVINGS_FACTOR)


def _active_hours(window: str) -> dict:
    """
    Fraction of time each device was actively conditioning vs standing by.
    Uses ONE_HOUR intervals where was_adjusting_temperature is available.
    """
    df = intervals(window)
    df = df[df["time_range"] == "FIFTEEN_MINUTES"]
    total = len(df)
    active = int(df["was_adjusting_temperature"].sum())
    return {
        "total_device_hours": total,
        "active_device_hours": active,
        "standby_device_hours": total - active,
        "active_fraction": round(active / total, 3) if total else 0.0,
    }


def _savings(actual: float) -> dict:
    baseline = _baseline_kwh(actual)
    saved = baseline - actual
    return {
        "actual_kwh": round(actual, 2),
        "baseline_kwh": round(baseline, 2),
        "energy_saved_kwh": round(saved, 2),
        "cost_saved_eur": round(saved * ELECTRICITY_PRICE_EUR_PER_KWH, 2),
        "co2_saved_kg": round(saved * CO2_KG_PER_KWH, 2),
    }


def summary() -> dict:
    """Total savings across both windows."""
    results = {}
    total_actual = 0.0

    for window in ("heating", "cooling"):
        df = power_draw(window)
        actual = _energy_kwh(df)
        total_actual += actual
        s = _savings(actual)
        s["active_hours"] = _active_hours(window)
        results[window] = s

    results["total"] = _savings(total_actual)
    return results


def by_device() -> list[dict]:
    """Per-device savings across both windows combined."""
    df = power_draw_all()
    devs = devices()
    label_map = devs.set_index("device_id")["label"].to_dict()
    out = []

    for device_id, grp in df.groupby("device_id"):
        actual = _energy_kwh(grp)
        s = _savings(actual)
        s["device_id"] = device_id
        s["device_name"] = label_map.get(device_id, device_id)

        # Per-window breakdown for this device
        s["by_window"] = {}
        for window in ("heating", "cooling"):
            wdf = grp[grp["window"] == window]
            if not wdf.empty:
                s["by_window"][window] = _savings(_energy_kwh(wdf))

        out.append(s)

    return sorted(out, key=lambda x: x["device_name"])


def timeline(window: str, bucket: str = "1h") -> list[dict]:
    """
    Power consumption over time, bucketed, for charts.
    bucket: pandas offset alias — '15min', '1h', '1D'
    """
    df = power_draw(window).set_index("timestamp")
    grouped = (
        df.groupby("device_name")["power_draw_kw"]
        .resample(bucket)
        .mean()
        .reset_index()
    )
    grouped.columns = ["device_name", "timestamp", "avg_power_kw"]
    grouped["energy_kwh"] = grouped["avg_power_kw"] * (
        pd.Timedelta(bucket).total_seconds() / 3600
    )
    grouped["timestamp"] = grouped["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    grouped["avg_power_kw"] = grouped["avg_power_kw"].round(3)
    grouped["energy_kwh"] = grouped["energy_kwh"].round(4)
    return grouped.dropna().to_dict(orient="records")
