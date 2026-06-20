"""
Weather forecast service using Open-Meteo (free, no API key required).
Location: Ottobrunn-Taufkirchen, Munich area — TUM Aerospace & Geodesy Campus.
"""

from datetime import datetime, timezone
from typing import Optional

UTC = timezone.utc

import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# TUM Aerospace & Geodesy Campus, Ottobrunn-Taufkirchen
DEFAULT_LAT = 48.063
DEFAULT_LON = 11.663
HEATING_LIKELY_THRESHOLD_CELSIUS = 16.0
COOLING_LIKELY_THRESHOLD_CELSIUS = 24.0

HOURLY_VARS = [
    "temperature_2m",
    "apparent_temperature",
    "relative_humidity_2m",
    "precipitation_probability",
    "precipitation",
    "wind_speed_10m",
    "cloud_cover",
    "weather_code",
]

DAILY_VARS = [
    "temperature_2m_max",
    "temperature_2m_min",
    "apparent_temperature_max",
    "apparent_temperature_min",
    "sunrise",
    "sunset",
    "precipitation_sum",
    "weather_code",
]


def fetch_forecast(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON, days: int = 7) -> dict:
    params: dict[str, str | int | float] = {
        "latitude": lat,
        "longitude": lon,
        "hourly": ",".join(HOURLY_VARS),
        "daily": ",".join(DAILY_VARS),
        "forecast_days": days,
        "timezone": "Europe/Berlin",
        "wind_speed_unit": "ms",
    }

    resp = requests.get(OPEN_METEO_URL, params=params, timeout=10)
    resp.raise_for_status()
    raw = resp.json()

    return {
        "location": {
            "latitude": raw["latitude"],
            "longitude": raw["longitude"],
            "timezone": raw["timezone"],
        },
        "hourly": _parse_hourly(raw["hourly"]),
        "daily": _parse_daily(raw["daily"]),
        "fetched_at": datetime.now(UTC).isoformat(),
    }


def fetch_current(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    """Return only the forecast hour closest to now."""
    forecast = fetch_forecast(lat, lon, days=1)
    now = datetime.now(UTC)
    hourly = forecast["hourly"]

    closest = min(
        hourly,
        key=lambda h: abs(datetime.fromisoformat(h["time"]).replace(tzinfo=UTC) - now),
    )
    return {
        "location": forecast["location"],
        "current": closest,
        "fetched_at": forecast["fetched_at"],
    }


def _parse_hourly(raw: dict) -> list[dict]:
    times = raw["time"]
    rows = []
    for i, t in enumerate(times):
        row = {"time": t}
        for var in HOURLY_VARS:
            row[var] = _safe(raw.get(var), i)
        row["heating_likely"] = _heating_likely(row)
        row["cooling_likely"] = _cooling_likely(row)
        row["hvac_mode"] = _hvac_mode(row)
        rows.append(row)
    return rows


def _parse_daily(raw: dict) -> list[dict]:
    times = raw["time"]
    rows = []
    for i, t in enumerate(times):
        row = {"date": t}
        for var in DAILY_VARS:
            row[var] = _safe(raw.get(var), i)
        rows.append(row)
    return rows


def _safe(lst: Optional[list], i: int) -> Optional[object]:
    if lst is None or i >= len(lst):
        return None
    return lst[i]


def _heating_likely(hour: dict) -> bool:
    """Outside temp low enough that the space will need heating toward the 21 °C event setpoint."""
    temp = hour.get("temperature_2m")
    if not isinstance(temp, int | float):
        return False
    return float(temp) < HEATING_LIKELY_THRESHOLD_CELSIUS


def _cooling_likely(hour: dict) -> bool:
    """Outside temp high enough that the space will need active cooling to stay at 21 °C."""
    temp = hour.get("temperature_2m")
    if not isinstance(temp, int | float):
        return False
    return float(temp) > COOLING_LIKELY_THRESHOLD_CELSIUS


def _hvac_mode(hour: dict) -> str:
    """
    Mirrors the device status_operation_mode values (HEAT / COOL / AUTO).
    AUTO = neither threshold crossed, let the unit decide.
    """
    if _heating_likely(hour):
        return "HEAT"
    if _cooling_likely(hour):
        return "COOL"
    return "AUTO"
