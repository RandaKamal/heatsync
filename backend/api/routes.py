from datetime import UTC, datetime

import comfort.model as comfort
import impact.calculator as impact
import pandas as pd
from anomaly import detector
from control import controller
from data import loader
from flask import Blueprint, Response, jsonify, request
from prediction import predictor

from api.weather import DEFAULT_LAT, DEFAULT_LON, fetch_current, fetch_forecast

api_bp = Blueprint("api", __name__, url_prefix="/api")

SPACE_ID = "3dbed10b-9e88-4163-916d-3182e2ecc69f"


# ── helpers ──────────────────────────────────────────────────────────────────


def _err(msg: str, code: int = 400) -> tuple[Response, int]:
    return jsonify({"error": msg}), code


# ── health ────────────────────────────────────────────────────────────────────


@api_bp.get("/health")
def health() -> Response:
    return jsonify({"status": "ok"})


# ── weather ───────────────────────────────────────────────────────────────────


@api_bp.get("/weather/forecast")
def weather_forecast() -> Response:
    """7-day hourly + daily forecast. Query: lat, lon, days (1-16)."""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    days = max(1, min(int(request.args.get("days", 7)), 16))
    return jsonify(fetch_forecast(lat, lon, days))


@api_bp.get("/weather/current")
def weather_current() -> Response:
    """Current conditions (nearest forecast hour to now)."""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(fetch_current(lat, lon))


# ── devices ───────────────────────────────────────────────────────────────────


@api_bp.get("/devices")
def list_devices() -> Response:
    """All devices with 3-D position and latest snapshot per window."""
    devs = loader.devices().to_dict(orient="records")
    positions = controller.DEVICE_POSITIONS
    for d in devs:
        did = d["device_id"]
        d["position"] = positions.get(did, {})
    return jsonify(devs)


@api_bp.get("/devices/<device_id>/snapshots")
def device_snapshots(device_id: str) -> Response | tuple[Response, int]:
    """
    Recent snapshots for a device.
    Query: window (heating|cooling), limit (default 100)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    limit = min(int(request.args.get("limit", 100)), 1000)

    df = loader.snapshots(window)
    df = df[df["device_id"] == device_id].tail(limit)
    if df.empty:
        return _err(f"No snapshots found for device {device_id}", 404)

    df = df.copy()
    df["last_seen_at"] = df["last_seen_at"].astype(str)
    return jsonify(df.to_dict(orient="records"))


@api_bp.get("/devices/<device_id>/power")
def device_power(device_id: str) -> Response | tuple[Response, int]:
    """
    Power draw history for a single device.
    Query: window (heating|cooling), bucket (15min|1h|1D)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    bucket = request.args.get("bucket", "1h")

    df = loader.power_draw(window)
    df = df[df["device_id"] == device_id]
    if df.empty:
        return _err(f"No power data found for device {device_id}", 404)

    df = df.set_index("timestamp")["power_draw_kw"].resample(bucket).mean().reset_index()
    df["timestamp"] = df["timestamp"].dt.strftime("%Y-%m-%dT%H:%M:%SZ")
    df["power_draw_kw"] = df["power_draw_kw"].round(3)
    return jsonify(df.to_dict(orient="records"))


# ── spaces / events ───────────────────────────────────────────────────────────


@api_bp.get("/spaces/events")
def space_events_all() -> Response:
    """All scheduled space events across both windows."""
    result = {}
    for window in ("heating", "cooling"):
        df = loader.space_events(window).copy()
        df["starts_at"] = df["starts_at"].astype(str)
        df["ends_at"] = df["ends_at"].astype(str)
        result[window] = df.to_dict(orient="records")
    return jsonify(result)


# ── impact ────────────────────────────────────────────────────────────────────


@api_bp.get("/impact/summary")
def impact_summary() -> Response:
    """
    Energy saved (kWh), cost saved (€), CO2 saved (kg) — both windows + total.
    """
    return jsonify(impact.summary())


@api_bp.get("/impact/by-device")
def impact_by_device() -> Response:
    """Per-device savings breakdown."""
    return jsonify(impact.by_device())


@api_bp.get("/impact/timeline")
def impact_timeline() -> Response | tuple[Response, int]:
    """
    Time-series power consumption for charts.
    Query: window (heating|cooling), bucket (15min|1h|1D, default 1h)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    bucket = request.args.get("bucket", "1h")
    return jsonify(impact.timeline(window, bucket))


# ── control ───────────────────────────────────────────────────────────────────


@api_bp.get("/control/status")
def control_status() -> Response:
    """Current HVAC control state including all device overrides."""
    return jsonify(controller.get_status())


@api_bp.post("/control/mode")
def control_mode() -> Response | tuple[Response, int]:
    """
    Set global HVAC mode.
    Body: {"mode": "AUTO"|"HEAT"|"COOL"|"OFF"}
    """
    body = request.get_json(silent=True) or {}
    mode = body.get("mode")
    if not mode:
        return _err("'mode' is required")
    try:
        return jsonify(controller.set_mode(mode.upper()))
    except ValueError as e:
        return _err(str(e))


@api_bp.post("/control/setpoint")
def control_setpoint() -> Response | tuple[Response, int]:
    """
    Set global temperature setpoint.
    Body: {"temperature": 21.0}
    """
    body = request.get_json(silent=True) or {}
    temp = body.get("temperature")
    if temp is None:
        return _err("'temperature' is required")
    try:
        return jsonify(controller.set_setpoint(float(temp)))
    except ValueError as e:
        return _err(str(e))


@api_bp.post("/control/device/<device_id>/toggle")
def control_device_toggle(device_id: str) -> Response | tuple[Response, int]:
    """
    Enable or disable a specific device.
    Body: {"enabled": true|false}
    """
    body = request.get_json(silent=True) or {}
    enabled = body.get("enabled")
    if enabled is None:
        return _err("'enabled' is required")
    try:
        return jsonify(controller.toggle_device(device_id, bool(enabled)))
    except ValueError as e:
        return _err(str(e), 404)


@api_bp.post("/control/device/<device_id>/setpoint")
def control_device_setpoint(device_id: str) -> Response | tuple[Response, int]:
    """
    Set per-device temperature override. Pass null to clear override.
    Body: {"temperature": 20.0}  or  {"temperature": null}
    """
    body = request.get_json(silent=True) or {}
    temp = body.get("temperature")  # may be None (explicit null) to clear
    try:
        celsius = float(temp) if temp is not None else None
        return jsonify(controller.set_device_setpoint(device_id, celsius))
    except ValueError as e:
        return _err(str(e))


@api_bp.post("/control/prediction")
def control_prediction() -> Response | tuple[Response, int]:
    """
    Enable or disable automatic predictive scheduling.
    Body: {"enabled": true|false}
    """
    body = request.get_json(silent=True) or {}
    enabled = body.get("enabled")
    if enabled is None:
        return _err("'enabled' is required")
    return jsonify(controller.toggle_prediction(bool(enabled)))


# ── prediction ────────────────────────────────────────────────────────────────


@api_bp.get("/prediction/schedule")
def prediction_schedule() -> Response:
    """
    Recommended start times for all upcoming events in the next 7 days,
    based on weather forecast and historical heating/cooling rates.
    """
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(predictor.schedule(lat, lon))


@api_bp.get("/prediction/preheat")
def prediction_preheat() -> Response:
    """Should a preheat/precool action start right now?"""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(predictor.preheat_now(lat, lon))


# ── comfort ───────────────────────────────────────────────────────────────────


@api_bp.get("/comfort/current")
def comfort_current() -> Response:
    """
    Live thermal comfort snapshot using latest sensor data from the most
    recent device snapshot (or explicit query params for demo use).

    Query params (all optional — defaults from latest snapshot):
      ta   float  air temperature (°C)
      rh   float  relative humidity (%)
      occ  int    estimated room occupancy (persons)
    """
    default_ta = 21.0
    default_rh = 45.0
    try:
        snap = loader.snapshots("cooling")
        latest = snap.sort_values("last_seen_at").iloc[-1]
        default_ta = float(latest.get("status_temperature_in_celsius", 21.0))
        default_rh = float(latest.get("status_humidity_in_percent", 45.0))
    except (IndexError, KeyError, TypeError, ValueError):
        pass

    month = datetime.now().month
    ta = float(request.args.get("ta", default_ta))
    rh = float(request.args.get("rh", default_rh))
    occ = int(request.args.get("occ", 30))

    return jsonify(comfort.comfort_status(ta=ta, rh=rh, month=month, occupancy=occ))


@api_bp.get("/comfort/setpoint")
def comfort_setpoint_for_month() -> Response:
    """
    Seasonal comfort setpoint for a given month and occupancy.
    Query: month (1-12, default current), occupancy (int, default 0)
    """
    month = int(request.args.get("month", datetime.now().month))
    occ = int(request.args.get("occupancy", 0))
    return jsonify(
        {
            "month": month,
            "occupancy": occ,
            "clothing_insulation_clo": comfort.seasonal_clo(month),
            "comfort_setpoint_celsius": comfort.comfort_setpoint(month, occ),
            "mold_absolute_min_celsius": comfort.MOLD_ABSOLUTE_MIN_CELSIUS,
            "mold_safe_min_celsius": comfort.MOLD_SAFE_MIN_CELSIUS,
            "max_event_power_fraction": comfort.MAX_EVENT_POWER_FRACTION,
        }
    )


@api_bp.get("/comfort/holidays")
def comfort_holidays() -> Response:
    """
    Bayern public holidays in the next N days (no occupancy → unoccupied setpoint).
    Query: days (default 60)
    """
    days = int(request.args.get("days", 60))
    return jsonify(comfort.upcoming_holidays(days))


# ── anomaly ───────────────────────────────────────────────────────────────────


@api_bp.get("/anomaly/alerts")
def anomaly_alerts() -> Response | tuple[Response, int]:
    """
    All detected anomalies.
    Query: window (heating|cooling, default heating)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    return jsonify(detector.summary(window))


# ── Technician notifications ───────────────────────────────────────────────────

_notification_log: list[dict] = []


@api_bp.post("/anomaly/notify")
def notify_technician() -> Response | tuple[Response, int]:
    """
    Log a technician notification for an active alert.
    Body: { roomName, unitId, severity, message, deviceId }

    In production this would trigger an SMS/email via an external service.
    For now it records to an in-memory log and returns the full log.
    """
    body = request.get_json(silent=True) or {}
    required = {"roomName", "unitId", "severity", "message"}
    missing = required - body.keys()
    if missing:
        return _err(f"Missing fields: {', '.join(missing)}")

    entry = {
        "id": len(_notification_log) + 1,
        "timestamp": datetime.now(UTC).isoformat(),
        "roomName": body["roomName"],
        "unitId": body["unitId"],
        "deviceId": body.get("deviceId", ""),
        "severity": body["severity"],
        "message": body["message"],
        "status": "sent",
    }
    _notification_log.append(entry)
    return jsonify({"ok": True, "notification": entry, "totalSent": len(_notification_log)})


@api_bp.get("/anomaly/notifications")
def get_notifications() -> Response:
    """Return the full technician notification log."""
    return jsonify(_notification_log)


# ── Frontend aggregated status ─────────────────────────────────────────────────

# 3-D positions match the React building layout exactly
_ROOM_MAP = [
    {
        "id": "wing-a",
        "name": "Wing A",
        "device_id": "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",
        "position": [-16, 2, -8],
        "size": [14, 4, 12],
        "hp_id": "HP-A1",
        "hp_pos": [-16, 5.1, -8],
    },
    {
        "id": "wing-b",
        "name": "Wing B",
        "device_id": "1c893f75-4599-4402-9d4c-1017aa858fa8",
        "position": [0, 2, -8],
        "size": [14, 4, 12],
        "hp_id": "HP-B1",
        "hp_pos": [0, 5.1, -8],
    },
    {
        "id": "wing-c",
        "name": "Wing C",
        "device_id": "e72fea56-abe7-4d3f-a0ed-1e6b6c462157",
        "position": [16, 2, -8],
        "size": [14, 4, 12],
        "hp_id": "HP-C1",
        "hp_pos": [16, 5.1, -8],
    },
    {
        "id": "main-hall",
        "name": "Main Hall",
        "device_id": "930f3621-05df-4574-9270-9d994c5b716c",
        "position": [-16, 2, 8],
        "size": [14, 4, 12],
        "hp_id": "HP-D1",
        "hp_pos": [-16, 5.1, 8],
    },
]

_OFFLINE_ROOMS = [
    {"id": "hall-e", "name": "Hall E", "position": [0, 2, 8], "size": [14, 4, 12]},
    {"id": "tech-room", "name": "Technical Room", "position": [16, 2, 8], "size": [14, 4, 12]},
]

CO2_KG_PER_KWH = 0.380
EUR_PER_KWH = 0.25
IHL_SAVINGS_FACTOR = 0.25


def _weather_label(code: object) -> str:
    if code is None:
        return "Clear"
    c = int(code)  # type: ignore[arg-type]
    if c == 0:
        return "Clear"
    if 1 <= c <= 3:
        return "Partly Cloudy"
    if 45 <= c <= 48:
        return "Foggy"
    if 51 <= c <= 67:
        return "Drizzle"
    if 71 <= c <= 77:
        return "Snow"
    if 80 <= c <= 86:
        return "Showers"
    if 95 <= c <= 99:
        return "Thunderstorm"
    return "Cloudy"


def _make_offline_room(cfg: dict) -> dict:
    return {
        "id": cfg["id"],
        "name": cfg["name"],
        "position": cfg["position"],
        "size": cfg["size"],
        "status": "idle",
        "temperature": {"current": 18.0, "target": 21.0, "outside": 15.0},
        "occupancy": {"current": 0, "max": 50},
        "heatPumps": [],
        "tempHistory": [],
        "energyHistory": [],
        "anomalies": [],
    }


def _safe_float(val: object, default: float = 0.0) -> float:
    try:
        v = float(val)  # type: ignore[arg-type]
        return default if (v != v) else v  # NaN guard
    except (TypeError, ValueError):
        return default


def _uptime_str(seconds: float) -> str:
    h, rem = divmod(int(seconds), 3600)
    m = rem // 60
    return f"{h} h {m:02d} min"


def _compute_advice(
    temp_c: float,
    target: float,
    outside_temp: float,
    dev_ivs: "pd.DataFrame",
    current_mode: str,
) -> dict:
    """
    Compute occupancy status, ETA to target, efficiency, and a plain-language
    recommendation for the detail panel.
    """
    from datetime import datetime

    now_utc = datetime.now(UTC)
    hour = now_utc.hour + now_utc.minute / 60.0

    # ── Occupancy ────────────────────────────────────────────────────────────
    # Space events run 04:30-21:30 every day in the dataset.
    # We use real time-of-day as a proxy for live occupancy.
    OCCUPIED_START = 4.5  # 04:30
    OCCUPIED_END = 21.5  # 21:30
    PREHEAT_WINDOW = 0.5  # 30 min before start

    is_occupied = OCCUPIED_START <= hour < OCCUPIED_END
    preheat_soon = (OCCUPIED_START - PREHEAT_WINDOW) <= hour < OCCUPIED_START

    if is_occupied:
        occ_status = "occupied"
    elif preheat_soon:
        occ_status = "preheat"
    else:
        occ_status = "unoccupied"

    minutes_to_occupied: int | None = None
    if not is_occupied and hour < OCCUPIED_START:
        minutes_to_occupied = int((OCCUPIED_START - hour) * 60)

    # ── Heating / cooling rate from historical intervals ──────────────────────
    # Prefer cooling-window data; fall back to heating window; then physics default.
    # Typical ORIO-025 in a 150 m² room: ~0.4–0.6 °C per 15 min under load.
    HEAT_RATE_DEFAULT = 0.5  # °C per 15-min interval (heating)
    COOL_RATE_DEFAULT = -0.4  # °C per 15-min interval (cooling)

    eta_minutes: int | None = None
    rate_source = "estimated"

    def _rates_from_ivs(ivs_df: "pd.DataFrame") -> tuple[float, float]:
        adj = ivs_df[ivs_df["was_adjusting_temperature"] == 1].sort_values("interval_start_time")
        temps = pd.to_numeric(adj["median_temperature_in_celsius"], errors="coerce").dropna()
        deltas = temps.diff().dropna()
        hr = float(deltas[deltas > 0].median()) if (deltas > 0).any() else 0.0
        cr = float(deltas[deltas < 0].median()) if (deltas < 0).any() else 0.0
        return hr, cr

    heat_rate, cool_rate = _rates_from_ivs(dev_ivs)

    # Fall back to heating window if current window has no adjusting rows
    if heat_rate == 0.0 and cool_rate == 0.0:
        try:
            heat_ivs = loader.intervals("heating")
            heat_ivs = (
                heat_ivs[heat_ivs["device_id"] == dev_ivs["device_id"].iloc[0]]
                if not dev_ivs.empty
                else heat_ivs
            )
            heat_rate, cool_rate = _rates_from_ivs(heat_ivs)
            if heat_rate != 0.0 or cool_rate != 0.0:
                rate_source = "measured (heating window)"
        except Exception:
            pass

    # Physics default if still no data
    if heat_rate == 0.0:
        heat_rate = HEAT_RATE_DEFAULT
    if cool_rate == 0.0:
        cool_rate = COOL_RATE_DEFAULT
    if rate_source == "estimated":
        rate_source = "estimated" if heat_rate == HEAT_RATE_DEFAULT else rate_source

    delta = target - temp_c
    if delta > 0.3:
        eta_intervals = delta / heat_rate
        eta_minutes = max(1, int(eta_intervals * 15))
        if heat_rate != HEAT_RATE_DEFAULT:
            rate_source = "measured"
    elif delta < -0.3:
        eta_intervals = delta / abs(cool_rate)
        eta_minutes = max(1, int(eta_intervals * 15))
        if cool_rate != COOL_RATE_DEFAULT:
            rate_source = "measured"
    else:
        eta_minutes = 0

    # ── Efficiency ────────────────────────────────────────────────────────────
    # Heat pump COP degrades significantly below -10°C outside (heating)
    # and above 35°C outside (cooling).
    delta = target - temp_c
    needs_heat = delta > 0.3
    needs_cool = delta < -0.3

    if needs_heat:
        if outside_temp >= 5:
            efficiency = "good"
            eff_note = f"Outside {outside_temp}°C — heat pump COP is high."
        elif outside_temp >= -5:
            efficiency = "fair"
            eff_note = f"Outside {outside_temp}°C — moderate efficiency."
        else:
            efficiency = "poor"
            eff_note = f"Outside {outside_temp}°C — consider pre-heating earlier."
    elif needs_cool:
        if outside_temp <= 30:
            efficiency = "good"
            eff_note = f"Outside {outside_temp}°C — cooling is efficient."
        elif outside_temp <= 38:
            efficiency = "fair"
            eff_note = f"Outside {outside_temp}°C — moderate cooling efficiency."
        else:
            efficiency = "poor"
            eff_note = f"Outside {outside_temp}°C — cooling heavily loaded."
    else:
        efficiency = "good"
        eff_note = "Room is at target — minimal energy needed."

    # ── ETA label ─────────────────────────────────────────────────────────────
    if eta_minutes is None:
        eta_label = "ETA unknown"
    elif eta_minutes == 0:
        eta_label = "At target"
    elif eta_minutes < 60:
        eta_label = f"~{eta_minutes} min to {target:.1f}°C"
    else:
        h, m = divmod(eta_minutes, 60)
        eta_label = f"~{h}h {m}min to {target:.1f}°C"

    # ── Recommendation ────────────────────────────────────────────────────────
    diff = abs(target - temp_c)
    rec_lines: list[str] = []

    if occ_status == "unoccupied":
        if diff > 1.0:
            rec_lines.append(
                "Hall is unoccupied until ~04:30. "
                "Consider lowering target to minimum (12°C) to save energy."
            )
        else:
            rec_lines.append("Hall is unoccupied. Holding minimum temperature.")

    elif occ_status == "preheat":
        rec_lines.append(
            f"Occupancy starts in ~{minutes_to_occupied} min. "
            f"Pre-heating now ensures comfort on arrival."
        )

    mode_upper = current_mode.upper()
    if needs_heat:
        action = "Set mode to HEAT." if mode_upper not in ("HEAT", "AUTO") else ""
        mismatch = (
            f" Currently in {mode_upper} mode — switch to HEAT." if mode_upper == "COOL" else ""
        )
        rec_lines.append(
            f"Room {temp_c:.1f}°C is {delta:.1f}°C below target.{mismatch or (' ' + action if action else '')}"
        )
    elif needs_cool:
        action = "Set mode to COOL." if mode_upper not in ("COOL", "AUTO") else ""
        mismatch = (
            f" Currently in {mode_upper} mode — switch to COOL." if mode_upper == "HEAT" else ""
        )
        rec_lines.append(
            f"Room {temp_c:.1f}°C is {abs(delta):.1f}°C above target.{mismatch or (' ' + action if action else '')}"
        )
    else:
        rec_lines.append(f"Room is at target {target:.1f}°C. AUTO mode is sufficient.")

    if efficiency == "poor":
        rec_lines.append(eff_note)

    recommendation = " ".join(rec_lines) if rec_lines else "No action needed."

    return {
        "occupancyStatus": occ_status,
        "minutesToOccupied": minutes_to_occupied,
        "etaMinutes": eta_minutes,
        "etaLabel": eta_label,
        "etaSource": rate_source,
        "efficiency": efficiency,
        "efficiencyNote": eff_note,
        "recommendation": recommendation,
        "needsHeat": needs_heat,
        "needsCool": needs_cool,
    }


@api_bp.get("/status")
def frontend_status() -> Response:
    """
    Single aggregated endpoint for the HeatSync 3-D UI.
    Returns 4 device-backed rooms + 2 offline placeholders (6 total).
    """
    WINDOW = "cooling"  # most recent data window (2026-05-25 to 2026-05-31)
    INTERVAL_HOURS = 5 / 60  # power_draw: 5-minute samples

    # ── Raw data ──────────────────────────────────────────────────────────────
    df = loader.snapshots(WINDOW).copy()
    df["last_seen_at"] = pd.to_datetime(df["last_seen_at"])

    ivs = loader.intervals(WINDOW).copy()  # FIFTEEN_MINUTES only
    ivs["interval_start_time"] = pd.to_datetime(ivs["interval_start_time"])

    pwr = loader.power_draw(WINDOW).copy()
    # timestamp already parsed by loader

    ctrl = controller.get_status()
    ctrl_devs = {d["device_id"]: d for d in ctrl["devices"]}

    try:
        all_alerts: list[dict] = detector.alerts(WINDOW)
    except Exception:
        all_alerts = []
    alerts_by_dev: dict[str, list[dict]] = {}
    for a in all_alerts:
        alerts_by_dev.setdefault(a["device_id"], []).append(a)

    try:
        imp = impact.summary()
        total_sav: dict = imp.get("total", {})
    except Exception:
        total_sav = {}

    # Live weather — fail gracefully
    weather: dict = {"temp": 15.0, "humidity": 60, "condition": "Clear"}
    try:
        w = fetch_current(DEFAULT_LAT, DEFAULT_LON)
        curr = w.get("current", {})
        weather = {
            "temp": round(_safe_float(curr.get("temperature_2m"), 15.0), 1),
            "humidity": int(_safe_float(curr.get("relative_humidity_2m"), 60)),
            "condition": _weather_label(curr.get("weather_code")),
        }
    except Exception:
        pass

    outside_temp = weather["temp"]

    # ── Build rooms ───────────────────────────────────────────────────────────
    rooms: list[dict] = []
    total_units = 0
    active_units = 0
    alert_count = 0

    for cfg in _ROOM_MAP:
        did = cfg["device_id"]
        dev_snaps = df[df["device_id"] == did].sort_values("last_seen_at")

        if dev_snaps.empty:
            rooms.append(_make_offline_room(cfg))
            continue

        latest = dev_snaps.iloc[-1]
        ctrl_d = ctrl_devs.get(did, {})
        target = _safe_float(ctrl_d.get("setpoint_celsius", ctrl["setpoint_celsius"]), 21.0)

        # ── Unit status (§9 of integration guide) ────────────────────────────
        regs = str(latest.get("status_error_registers", "0,0,0,0")).strip()
        if not bool(latest.get("status_is_enabled", 1)):
            unit_st = "idle"
        elif bool(latest.get("status_is_alarm_active", 0)):
            unit_st = "error"
        elif bool(latest.get("status_is_defrost_active", 0)) or regs not in ("0,0,0,0", "0", ""):
            unit_st = "warning"
        elif bool(latest.get("status_is_heating_required", 0)) or bool(
            latest.get("status_is_cooling_required", 0)
        ):
            unit_st = "active"
        else:
            unit_st = "idle"

        room_st = (
            "error" if unit_st == "error" else ("warning" if unit_st == "warning" else "optimal")
        )

        total_units += 1
        if unit_st == "active":
            active_units += 1
        if unit_st in ("warning", "error"):
            alert_count += 1

        # ── Sensor readings ───────────────────────────────────────────────────
        temp_c = _safe_float(latest.get("status_temperature_in_celsius"), 21.0)
        temp_sup = _safe_float(latest.get("status_temperature_supply_in_celsius"), 35.0)
        temp_ret = _safe_float(latest.get("status_temperature_return_in_celsius"), 20.0)
        temp_out = _safe_float(latest.get("status_temperature_outside_in_celsius"), outside_temp)
        humidity = _safe_float(latest.get("status_humidity_in_percent"), 50.0)
        co2_ppm = _safe_float(latest.get("status_carbon_dioxide_in_ppm"), 400.0)
        fan_sup = _safe_float(latest.get("status_air_flow_supply_in_percent"), 0.0)
        fan_ret = _safe_float(latest.get("status_air_flow_return_in_percent"), 0.0)
        uptime_s = _safe_float(latest.get("status_system_uptime_in_seconds"), 0.0)
        raw_regs = str(latest.get("status_error_registers", "0,0,0,0"))
        op_mode = str(latest.get("status_operation_mode", "AUTO"))

        # ── Current power ─────────────────────────────────────────────────────
        dev_pwr = pwr[pwr["device_id"] == did]["power_draw_kw"]
        pwr_now = round(_safe_float(dev_pwr.tail(12).mean()), 2) if not dev_pwr.empty else 0.0

        # ── Per-device energy savings (from actual power draw) ────────────────
        actual_kwh = float(dev_pwr.sum()) * INTERVAL_HOURS
        saved_kwh_dev = actual_kwh * IHL_SAVINGS_FACTOR
        unit_savings = {
            "kwh": round(saved_kwh_dev, 1),
            "co2": round(saved_kwh_dev * CO2_KG_PER_KWH, 1),
            "eur": round(saved_kwh_dev * EUR_PER_KWH, 2),
        }

        # ── 24-hour temperature chart (15-min intervals → last 96 = 24 h) ────
        dev_ivs = ivs[ivs["device_id"] == did].sort_values("interval_start_time")

        # Outside temperature: resample snapshots to 15-min averages
        indexed_snaps = dev_snaps.set_index("last_seen_at")
        h_out = (
            pd.to_numeric(
                indexed_snaps.get("status_temperature_outside_in_celsius", pd.Series(dtype=float)),
                errors="coerce",
            )
            .resample("15min")
            .mean()
        )

        temp_history: list[dict] = []
        for _, row in dev_ivs.tail(96).iterrows():
            ts = row["interval_start_time"]
            val = _safe_float(row.get("median_temperature_in_celsius"), float("nan"))
            tgt = _safe_float(row.get("target_temperature_in_celsius"), target)
            # Find nearest outside temp bucket
            out_key = ts.floor("15min")
            out_v = h_out.get(out_key, temp_out)
            if val != val:  # NaN
                continue
            temp_history.append(
                {
                    "time": ts.strftime("%H:%M"),
                    "temp": round(val, 1),
                    "target": round(tgt, 1),
                    "outside": round(_safe_float(out_v, temp_out), 1),
                }
            )

        # ── 7-day energy comparison chart ─────────────────────────────────────
        pwr_idx = dev_pwr.copy()
        pwr_idx.index = pwr[pwr["device_id"] == did]["timestamp"].values
        energy_history: list[dict] = []
        for ts, avg_kw in pwr_idx.resample("1D").mean().tail(7).items():
            if pd.isna(avg_kw):
                continue
            actual_day = float(avg_kw) * 24
            baseline_day = actual_day / (1 - IHL_SAVINGS_FACTOR)
            energy_history.append(
                {
                    "day": ts.strftime("%a"),
                    "actual": round(actual_day, 1),
                    "baseline": round(baseline_day, 1),
                }
            )

        # ── Anomalies from detector (decoded, capped at 5) ────────────────────
        anomalies: list[dict] = []
        for a in alerts_by_dev.get(did, [])[:5]:
            ts_str = str(a.get("timestamp", ""))
            anomalies.append(
                {
                    "id": f"{a['type']}-{ts_str[:10]}",
                    "severity": "high" if a["severity"] == "critical" else a["severity"],
                    "type": a["type"].replace("_", " ").title(),
                    "message": a["message"],
                    "time": ts_str[11:16] or "—",
                    "resolved": False,
                }
            )

        advice = _compute_advice(temp_c, target, temp_out, dev_ivs, op_mode)

        rooms.append(
            {
                "id": cfg["id"],
                "name": cfg["name"],
                "position": cfg["position"],
                "size": cfg["size"],
                "status": room_st,
                "temperature": {
                    "current": round(temp_c, 1),
                    "target": round(target, 1),
                    "outside": round(temp_out, 1),
                },
                "occupancy": {"current": 0, "max": 50},
                "advice": advice,
                "heatPumps": [
                    {
                        "id": cfg["hp_id"],
                        "deviceId": did,
                        "name": f"IMBAT Orion {cfg['hp_id']}",
                        "model": "ORIO-025",
                        "status": unit_st,
                        "position": cfg["hp_pos"],
                        "power": {"current": pwr_now, "max": 25.0},
                        "runtime": _uptime_str(uptime_s),
                        "mode": op_mode,
                        "temperature": {
                            "supply": round(temp_sup, 1),
                            "return": round(temp_ret, 1),
                        },
                        "airFlow": {
                            "supply": round(fan_sup, 1),
                            "return": round(fan_ret, 1),
                        },
                        "humidity": round(humidity, 1),
                        "co2Ppm": round(co2_ppm, 0),
                        "rawErrorRegisters": raw_regs,
                        "savings": unit_savings,
                        "anomalies": anomalies,
                    }
                ],
                "tempHistory": temp_history,
                "energyHistory": energy_history,
                "anomalies": anomalies,
            }
        )

    # Offline placeholder halls
    for cfg in _OFFLINE_ROOMS:
        rooms.append(_make_offline_room(cfg))

    # ── Building-level savings ────────────────────────────────────────────────
    saved_kwh = _safe_float(total_sav.get("energy_saved_kwh"), 0)
    saved_eur = _safe_float(total_sav.get("cost_saved_eur"), 0)
    saved_co2 = _safe_float(total_sav.get("co2_saved_kg"), 0)
    days = 14  # two 7-day windows combined

    return jsonify(
        {
            "rooms": rooms,
            "savings": {
                "kwh": {"today": round(saved_kwh / days, 1), "total": round(saved_kwh, 1)},
                "co2": {"today": round(saved_co2 / days, 1), "total": round(saved_co2, 1)},
                "eur": {"today": round(saved_eur / days, 2), "total": round(saved_eur, 2)},
            },
            "weather": weather,
            "mode": ctrl["mode"],
            "stats": {
                "activeUnits": active_units,
                "totalUnits": total_units,
                "alerts": alert_count,
            },
        }
    )
