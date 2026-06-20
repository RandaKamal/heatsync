"""
In-memory room schedule manager with energy window computation.

Pre-heat logic (challenge brief: "When should each heat pump switch on so
that every hall reaches the right temperature exactly when the lecture starts?"):

  preheat_lead = _lead_minutes(mode, outdoor_temp, target_setpoint, rates)
  Derived from predictor.py; accounts for:
    - Outdoor temperature (cold air → slower heat-up → more lead time)
    - Noise limit: ramp capped at 60% power during events nearby
    - Seasonal comfort setpoint (winter 20°C / summer 24°C)
  Result clamped to 15–120 min.

Wind-down logic (new, not in predictor.py):
  WIND_DOWN_BUFFER_MINUTES = 15
  After event end, hold occupied setpoint for 15 min (occupants linger).
  Then drop to MOLD_SAFE_MIN (14°C). Assumption based on VDI 3813 Part 4
  which recommends 10-20 min post-occupancy buffer for lecture halls.
  Tune WIND_DOWN_BUFFER_MINUTES if building thermal mass differs.
"""

from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

from comfort.model import (
    comfort_setpoint,
    MOLD_SAFE_MIN_CELSIUS,
    MAX_EVENT_POWER_FRACTION,
)
from api.weather import fetch_forecast, DEFAULT_LAT, DEFAULT_LON

BERLIN = ZoneInfo("Europe/Berlin")

# How long after event end to hold occupied setpoint before dropping to idle.
# Rationale: students/staff linger 10-20 min; 15 min is the midpoint.
WIND_DOWN_BUFFER_MINUTES = 15

# Unoccupied setpoint floor (mold-safe, from DIN 4108-2)
UNOCCUPIED_SETPOINT = max(11.0, MOLD_SAFE_MIN_CELSIUS)  # 14°C

# Historical heating/cooling rates derived from dataset intervals
# (same values used in predictor._rate_model()).
# 0.5°C per 15-min interval = 2°C/h when actively conditioning.
# These are fallback constants; live values come from loader if available.
_HEAT_RATE_DEG_PER_HOUR = 2.0
_COOL_RATE_DEG_PER_HOUR = 1.5

# Rooms known to the scheduler
ROOM_CATALOGUE: dict[str, dict] = {
    "main-space": {"name": "Main Space",      "capacity": 200},
    "hall-e":     {"name": "Hall E",          "capacity": 80},
    "tech-room":  {"name": "Technical Room",  "capacity": 40},
}

# In-memory event store
_events: list[dict] = []

# ─── helpers ────────────────────────────────────────────────────────────────

def _next_id() -> str:
    return f"evt-{len(_events) + 1:04d}"


def _parse_hhmm(hhmm: str, base: Optional[datetime] = None) -> datetime:
    """Parse 'HH:MM' string into a datetime (today in Berlin tz)."""
    if base is None:
        base = datetime.now(BERLIN)
    h, m = map(int, hhmm.split(":"))
    return base.replace(hour=h, minute=m, second=0, microsecond=0)


def _lead_minutes(mode: str, outdoor_temp: float, target_setpoint: float) -> int:
    """
    Estimate preheat/precool lead time.
    Mirrors predictor._lead_minutes() but self-contained so schedule module
    does not create a circular import with prediction/.
    """
    temp_delta = abs(target_setpoint - UNOCCUPIED_SETPOINT)

    if mode == "HEAT":
        base_rate = _HEAT_RATE_DEG_PER_HOUR
        # Colder outdoor air → slower heat-up
        factor = max(0.5, 1.0 - (10.0 - outdoor_temp) * 0.02)
    else:
        base_rate = _COOL_RATE_DEG_PER_HOUR
        # Hotter outdoor air → slower cool-down
        factor = max(0.5, 1.0 - (outdoor_temp - 20.0) * 0.02)

    # Noise cap: ramp limited to MAX_EVENT_POWER_FRACTION of full power
    effective_rate = base_rate * factor * MAX_EVENT_POWER_FRACTION
    minutes = (temp_delta / max(effective_rate, 0.5)) * 60
    return max(15, min(int(minutes), 120))


# ─── CRUD ───────────────────────────────────────────────────────────────────

def add_event(
    room_id: str,
    title: str,
    start: str,
    end: str,
    expected_students: int = 50,
    day: Optional[str] = None,
    recurrence: str = "once",
) -> dict:
    """Create and store an event. Raises ValueError for unknown rooms."""
    if room_id not in ROOM_CATALOGUE:
        raise ValueError(f"Unknown room '{room_id}'. Known: {list(ROOM_CATALOGUE)}")
    event: dict = {
        "id":               _next_id(),
        "roomId":           room_id,
        "title":            title,
        "start":            start,
        "end":              end,
        "expectedStudents": expected_students,
        "day":              day,
        "recurrence":       recurrence,
    }
    _events.append(event)
    return event


def list_events(room_id: Optional[str] = None) -> list[dict]:
    if room_id:
        return [e for e in _events if e["roomId"] == room_id]
    return list(_events)


def get_event(event_id: str) -> Optional[dict]:
    return next((e for e in _events if e["id"] == event_id), None)


def update_event(event_id: str, **kwargs) -> Optional[dict]:
    """Patch fields on an existing event."""
    global _events
    for i, ev in enumerate(_events):
        if ev["id"] == event_id:
            updated = {**ev, **kwargs}
            _events[i] = updated
            return updated
    return None


def delete_event(event_id: str) -> bool:
    global _events
    before = len(_events)
    _events = [e for e in _events if e["id"] != event_id]
    return len(_events) < before


# ─── Energy window computation ───────────────────────────────────────────────

def compute_energy_windows(
    events: Optional[list[dict]] = None,
    lat: float = DEFAULT_LAT,
    lon: float = DEFAULT_LON,
) -> list[dict]:
    """
    For each event return:
      preheat_start  – when to turn heat pump on
      event_start    – event begins (people arrive)
      event_end      – event ends
      wind_down_time – when to drop setpoint back to unoccupied level
      predicted_mode – HEAT / COOL / AUTO
      setpoint       – seasonal comfort target (°C)

    Challenge brief alignment:
      "holds it until the end" → we hold setpoint through wind_down_time,
      not just until event_end, so lingering students remain comfortable.
    """
    if events is None:
        events = _events

    now = datetime.now(BERLIN)
    month = now.month

    # Weather: fetch once, use first hourly temp as proxy for outdoor temp
    outdoor_temp = 15.0
    try:
        fc = fetch_forecast(lat, lon, days=1)
        hourly = fc.get("hourly", [])
        if hourly:
            outdoor_temp = float(hourly[0].get("temperature_2m", 15.0))
    except Exception:
        pass  # Use default 15°C if weather call fails

    windows = []
    for ev in events:
        occupancy = ev.get("expectedStudents", 50)
        setpoint  = comfort_setpoint(month, occupancy)

        # Determine HVAC mode from outdoor temp vs setpoint
        if outdoor_temp < setpoint - 5:
            mode = "HEAT"
        elif outdoor_temp > setpoint + 3:
            mode = "COOL"
        else:
            mode = "AUTO"

        lead = _lead_minutes(mode, outdoor_temp, setpoint)

        start_dt = _parse_hhmm(ev["start"])
        end_dt   = _parse_hhmm(ev["end"])
        if end_dt <= start_dt:
            end_dt += timedelta(hours=24)  # crosses midnight

        preheat_dt  = start_dt - timedelta(minutes=lead)
        wind_down_dt = end_dt + timedelta(minutes=WIND_DOWN_BUFFER_MINUTES)

        windows.append({
            "eventId":            ev["id"],
            "roomId":             ev.get("roomId", ""),
            "title":              ev.get("title", ""),
            "preheatStart":       preheat_dt.strftime("%H:%M"),
            "eventStart":         ev["start"],
            "eventEnd":           ev["end"],
            "windDownTime":       wind_down_dt.strftime("%H:%M"),
            "leadMinutes":        lead,
            "windDownBufferMin":  WIND_DOWN_BUFFER_MINUTES,
            "predictedMode":      mode,
            "setpointCelsius":    round(setpoint, 1),
            "outdoorTempCelsius": round(outdoor_temp, 1),
        })

    return windows


# ─── Seed default events for demo ────────────────────────────────────────────
# Two events in different rooms that overlap → triggers optimization suggestion.

def _seed_defaults() -> None:
    defaults = [
        {
            "room_id": "main-space", "title": "Thermodynamics Lecture",
            "start": "07:00", "end": "08:30", "expected_students": 120,
            "day": "Mon", "recurrence": "weekly",
        },
        {
            "room_id": "hall-e", "title": "Flight Systems Seminar",
            "start": "07:30", "end": "09:00", "expected_students": 28,
            "day": "Mon", "recurrence": "weekly",
        },
        {
            "room_id": "main-space", "title": "Geodesy Workshop",
            "start": "13:00", "end": "15:30", "expected_students": 85,
            "day": "Wed", "recurrence": "weekly",
        },
        {
            "room_id": "tech-room", "title": "Satellite Navigation Lab",
            "start": "13:30", "end": "15:00", "expected_students": 18,
            "day": "Wed", "recurrence": "biweekly",
        },
    ]
    for d in defaults:
        add_event(**d)


_seed_defaults()
