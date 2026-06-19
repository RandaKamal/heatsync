"""
Predictive control: estimates optimal heat pump start time for upcoming events.

Approach:
1. From historical intervals, derive heating/cooling rate (°C gap closed per hour).
2. Combine with live weather forecast, seasonal comfort setpoint, occupancy, and
   noise power limit to calculate required lead time before each event.
3. Skip Bayern public holidays — no occupancy, keep at unoccupied/mold-safe setpoint.

Space config (from dataset README):
  Unoccupied setpoint : 11 °C  (controlled up to mold-safe minimum by comfort model)
  Temperature limits  : 11–30 °C
"""

import pandas as pd
from datetime import datetime, timedelta, date, timezone
from zoneinfo import ZoneInfo

from loader import intervals_all
from api.weather import fetch_forecast, DEFAULT_LAT, DEFAULT_LON
from comfort.model import (
    comfort_setpoint,
    is_holiday_bavaria,
    MOLD_SAFE_MIN_CELSIUS,
    MAX_EVENT_POWER_FRACTION,
)

UNOCCUPIED_SETPOINT = max(11.0, MOLD_SAFE_MIN_CELSIUS)  # enforce mold floor
BERLIN = ZoneInfo("Europe/Berlin")

# Typical occupancy counts per event type (for setpoint adjustment)
DEFAULT_OCCUPANCY = {
    "Morning lecture": 80,
    "Afternoon lecture": 60,
}


# ── rate model ────────────────────────────────────────────────────────────────

def _rate_model() -> dict:
    """
    Heating/cooling rate (°C gap closed per 15-min interval → per hour)
    from historical intervals where the system was actively conditioning.
    """
    df = intervals_all()
    df = df[
        (df["was_adjusting_temperature"] == 1)
        & (df["time_range"] == "FIFTEEN_MINUTES")
    ]
    heat = df[df["operation_mode"] == "HEAT"]
    cool = df[df["operation_mode"] == "COOL"]

    def _rate(grp: pd.DataFrame) -> float:
        if grp.empty:
            return 5.0
        delta = (
            grp["target_temperature_in_celsius"].astype(float)
            - grp["median_temperature_in_celsius"].astype(float)
        ).clip(lower=0)
        return float(delta.median())

    return {
        "heat_rate_deg_per_hour": _rate(heat),
        "cool_rate_deg_per_hour": _rate(cool),
    }


def _lead_minutes(
    mode: str,
    outdoor_temp: float,
    target_setpoint: float,
    rates: dict,
) -> int:
    """
    Preheat/precool lead time accounting for:
    - Seasonal setpoint (may differ from 21 °C depending on clothing / occupancy)
    - Outdoor temperature (cold air slows heating, hot air slows cooling)
    - Noise limit (MAX_EVENT_POWER_FRACTION caps effective rate during the ramp)
    """
    temp_delta = abs(target_setpoint - UNOCCUPIED_SETPOINT)

    if mode == "HEAT":
        base_rate = rates["heat_rate_deg_per_hour"]
        outdoor_factor = max(0.5, 1.0 - (10.0 - outdoor_temp) * 0.02)
    else:
        base_rate = rates["cool_rate_deg_per_hour"]
        outdoor_factor = max(0.5, 1.0 - (outdoor_temp - 20.0) * 0.02)

    # Noise limit: ramp is capped at MAX_EVENT_POWER_FRACTION of full power
    # → effective heating/cooling rate scales proportionally
    effective_rate = base_rate * outdoor_factor * MAX_EVENT_POWER_FRACTION
    minutes = (temp_delta / max(effective_rate, 0.5)) * 60
    return max(15, min(int(minutes), 150))   # clamp 15–150 min


# ── upcoming events ───────────────────────────────────────────────────────────

def _upcoming_events(days: int = 7) -> list[dict]:
    """
    Weekday campus lecture schedule for the next `days` days.
    Bayern public holidays are excluded (no occupancy → no need to preheat).
    Occupancy is attached for setpoint adjustment.
    """
    now = datetime.now(BERLIN)
    events = []
    for offset in range(days + 1):
        day_dt = now + timedelta(days=offset)
        day = day_dt.replace(hour=0, minute=0, second=0, microsecond=0)

        if day.weekday() >= 5:          # Saturday or Sunday
            continue
        if is_holiday_bavaria(day.date()):
            continue                    # Bayern Feiertag — no lectures

        for name, start_h, start_m, end_h, end_m in [
            ("Morning lecture",   7,  0, 12, 0),
            ("Afternoon lecture", 13, 0, 18, 0),
        ]:
            s = day.replace(hour=start_h, minute=start_m).astimezone(timezone.utc)
            e = day.replace(hour=end_h,   minute=end_m).astimezone(timezone.utc)
            if e > datetime.now(timezone.utc):
                events.append({
                    "name": name,
                    "starts_at": s,
                    "ends_at": e,
                    "occupancy": DEFAULT_OCCUPANCY.get(name, 50),
                    "day_date": day.date(),
                })
    return events


# ── public API ────────────────────────────────────────────────────────────────

def schedule(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> list[dict]:
    """
    Recommended heat pump start times for upcoming campus events.
    Each event includes:
      - Seasonal comfort setpoint (adjusted for occupancy / clothing)
      - Predicted mode (HEAT / COOL / AUTO)
      - Lead time accounting for noise-limited ramp rate
      - Holiday skip reasoning where applicable
    """
    rates = _rate_model()
    forecast = fetch_forecast(lat, lon, days=7)
    hourly = {h["time"]: h for h in forecast["hourly"]}
    now = datetime.now(timezone.utc)
    results = []

    for ev in _upcoming_events(days=7):
        event_start = ev["starts_at"]
        if event_start <= now:
            continue

        month = event_start.astimezone(BERLIN).month
        occupancy = ev["occupancy"]
        target_setpoint = comfort_setpoint(month, occupancy)

        hour_key = event_start.astimezone(BERLIN).strftime("%Y-%m-%dT%H:00")
        hour_data = hourly.get(hour_key, {})
        outdoor_temp = hour_data.get("temperature_2m", 15.0)

        if outdoor_temp < (target_setpoint - 5):
            mode = "HEAT"
        elif outdoor_temp > (target_setpoint + 3):
            mode = "COOL"
        else:
            mode = "AUTO"

        lead = _lead_minutes(mode, outdoor_temp, target_setpoint, rates)
        recommended_start = event_start - timedelta(minutes=lead)

        results.append({
            "event_name": ev["name"],
            "event_start": event_start.isoformat(),
            "event_end": ev["ends_at"].isoformat(),
            "occupancy": occupancy,
            "outdoor_temp_celsius": outdoor_temp,
            "season_comfort_setpoint_celsius": target_setpoint,
            "mold_safe_min_celsius": MOLD_SAFE_MIN_CELSIUS,
            "noise_limited_power_fraction": MAX_EVENT_POWER_FRACTION,
            "predicted_mode": mode,
            "recommended_start": recommended_start.isoformat(),
            "lead_time_minutes": lead,
        })

    return results


def preheat_now(lat: float = DEFAULT_LAT, lon: float = DEFAULT_LON) -> dict:
    """Should a preheat/precool action start right now for the soonest event?"""
    upcoming = schedule(lat, lon)
    if not upcoming:
        return {"action": "NONE", "reason": "No upcoming events in the next 7 days."}

    soonest = upcoming[0]
    start_dt = datetime.fromisoformat(soonest["recommended_start"])
    now = datetime.now(timezone.utc)

    if now >= start_dt:
        return {
            "action": soonest["predicted_mode"],
            "event_name": soonest["event_name"],
            "event_start": soonest["event_start"],
            "recommended_start": soonest["recommended_start"],
            "target_setpoint_celsius": soonest["season_comfort_setpoint_celsius"],
            "lead_time_minutes": soonest["lead_time_minutes"],
            "reason": (
                f"Start {soonest['predicted_mode']} now — preheat window open. "
                f"Target {soonest['season_comfort_setpoint_celsius']}°C for "
                f"{soonest['occupancy']} expected occupants."
            ),
        }

    minutes_until = int((start_dt - now).total_seconds() / 60)
    return {
        "action": "WAIT",
        "event_name": soonest["event_name"],
        "event_start": soonest["event_start"],
        "recommended_start": soonest["recommended_start"],
        "minutes_until_action": minutes_until,
        "target_setpoint_celsius": soonest["season_comfort_setpoint_celsius"],
        "reason": (
            f"Start {soonest['predicted_mode']} in {minutes_until} min "
            f"(target {soonest['season_comfort_setpoint_celsius']}°C, "
            f"{soonest['occupancy']} occupants expected)."
        ),
    }
