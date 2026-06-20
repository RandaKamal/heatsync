# ruff: noqa: PLR0911, PLR0912, PLR0915, PLR2004
# Existing UI aggregation helpers intentionally retain readable inline thresholds.

import logging
import math
from datetime import UTC, datetime
from typing import Any, cast

import comfort.model as comfort
import impact.calculator as impact
import pandas as pd
from anomaly import detector
from control import controller
from data import loader
from flask import Blueprint, Response, jsonify, request
from optimization import optimizer
from prediction import predictor
from schedule import manager as schedule_manager

from api.weather import DEFAULT_LAT, DEFAULT_LON, fetch_current, fetch_forecast

api_bp = Blueprint("api", __name__, url_prefix="/api")

LOGGER = logging.getLogger(__name__)
SPACE_ID = "3dbed10b-9e88-4163-916d-3182e2ecc69f"
JsonDict = dict[str, Any]
RouteResult = Response | tuple[Response, int]


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
def device_snapshots(device_id: str) -> RouteResult:
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
def device_power(device_id: str) -> RouteResult:
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
def impact_timeline() -> RouteResult:
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
def control_mode() -> RouteResult:
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
def control_setpoint() -> RouteResult:
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
def control_device_toggle(device_id: str) -> RouteResult:
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
def control_device_setpoint(device_id: str) -> RouteResult:
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
def control_prediction() -> RouteResult:
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
def anomaly_alerts() -> RouteResult:
    """
    All detected anomalies.
    Query: window (heating|cooling, default heating)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    return jsonify(detector.summary(window))


# ── Technician notifications ───────────────────────────────────────────────────

_notification_log: list[JsonDict] = []


@api_bp.post("/anomaly/notify")
def notify_technician() -> RouteResult:
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

# All 4 devices share the same physical space.
# One room, four heat pumps.
_ROOM_CFG: JsonDict = {
    "id": "main-space",
    "name": "Main Space",
    "position": [0, 2, 0],
    "size": [60, 4, 12],
    "devices": [
        {
            "device_id": "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",
            "hp_id": "HP-1",
            "hp_pos": [-24, 5.1, 0],
        },
        {
            "device_id": "1c893f75-4599-4402-9d4c-1017aa858fa8",
            "hp_id": "HP-2",
            "hp_pos": [-8, 5.1, 0],
        },
        {
            "device_id": "e72fea56-abe7-4d3f-a0ed-1e6b6c462157",
            "hp_id": "HP-3",
            "hp_pos": [8, 5.1, 0],
        },
        {
            "device_id": "930f3621-05df-4574-9270-9d994c5b716c",
            "hp_id": "HP-4",
            "hp_pos": [24, 5.1, 0],
        },
    ],
}

_OFFLINE_ROOMS: list[JsonDict] = [
    {"id": "hall-e", "name": "Hall E", "position": [0, 2, 8], "size": [14, 4, 12]},
    {"id": "tech-room", "name": "Technical Room", "position": [16, 2, 8], "size": [14, 4, 12]},
]

CO2_KG_PER_KWH = 0.380
EUR_PER_KWH = 0.25
IHL_SAVINGS_FACTOR = 0.25


def _weather_label(code: object) -> str:
    if code is None or not isinstance(code, int | float | str):
        return "Clear"
    try:
        c = int(code)
    except ValueError:
        return "Clear"
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


def _make_offline_room(cfg: JsonDict) -> JsonDict:
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
        v = float(cast(Any, val))
        return default if math.isnan(v) else v
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
) -> JsonDict:
    """
    Compute occupancy status, ETA to target, efficiency, and a plain-language
    recommendation for the detail panel.
    """
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
    # Typical ORIO-025 in a 150 m² room: ~0.4-0.6 °C per 15 min under load.
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
        except Exception as exc:
            LOGGER.debug("Falling back to default HVAC temperature rates", exc_info=exc)

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
        mode_hint = mismatch or (" " + action if action else "")
        rec_lines.append(f"Room {temp_c:.1f}°C is {delta:.1f}°C below target.{mode_hint}")
    elif needs_cool:
        action = "Set mode to COOL." if mode_upper not in ("COOL", "AUTO") else ""
        mismatch = (
            f" Currently in {mode_upper} mode — switch to COOL." if mode_upper == "HEAT" else ""
        )
        mode_hint = mismatch or (" " + action if action else "")
        rec_lines.append(f"Room {temp_c:.1f}°C is {abs(delta):.1f}°C above target.{mode_hint}")
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
    Returns 1 room with 4 heat pumps + 2 offline placeholder halls.
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

    try:
        all_alerts: list[JsonDict] = detector.alerts(WINDOW)
    except Exception as exc:
        LOGGER.debug("Falling back to empty frontend alert list", exc_info=exc)
        all_alerts = []
    alerts_by_dev: dict[str, list[JsonDict]] = {}
    for a in all_alerts:
        alerts_by_dev.setdefault(a["device_id"], []).append(a)

    try:
        imp = impact.summary()
        total_sav: JsonDict = imp.get("total", {})
    except Exception as exc:
        LOGGER.debug("Falling back to empty frontend savings summary", exc_info=exc)
        total_sav = {}

    # Live weather — fail gracefully
    weather: JsonDict = {"temp": 15.0, "humidity": 60, "condition": "Clear"}
    try:
        w = fetch_current(DEFAULT_LAT, DEFAULT_LON)
        curr = w.get("current", {})
        weather = {
            "temp": round(_safe_float(curr.get("temperature_2m"), 15.0), 1),
            "humidity": int(_safe_float(curr.get("relative_humidity_2m"), 60)),
            "condition": _weather_label(curr.get("weather_code")),
        }
    except Exception as exc:
        LOGGER.debug("Falling back to default frontend weather", exc_info=exc)

    outside_temp = weather["temp"]

    # ── Build rooms ───────────────────────────────────────────────────────────
    rooms: list[JsonDict] = []
    total_units = 0
    active_units = 0
    alert_count = 0

    # Global setpoint for the space
    room_target = _safe_float(ctrl.get("setpoint_celsius"), 21.0)

    # ── Collect per-device data, build heatPumps list ─────────────────────────
    heat_pumps: list[JsonDict] = []
    all_room_temps: list[float] = []
    all_out_temps: list[float] = []
    combined_anomalies: list[JsonDict] = []

    room_devices = cast(list[JsonDict], _ROOM_CFG["devices"])

    for dev_cfg in room_devices:
        did = dev_cfg["device_id"]
        dev_snaps = df[df["device_id"] == did].sort_values("last_seen_at")

        if dev_snaps.empty:
            continue

        latest = dev_snaps.iloc[-1]

        # Unit status
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

        total_units += 1
        if unit_st == "active":
            active_units += 1
        if unit_st in ("warning", "error"):
            alert_count += 1

        # Sensor readings
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

        all_room_temps.append(temp_c)
        all_out_temps.append(temp_out)

        # Current power (last hour average)
        dev_pwr = pwr[pwr["device_id"] == did]["power_draw_kw"]
        pwr_now = round(_safe_float(dev_pwr.tail(12).mean()), 2) if not dev_pwr.empty else 0.0

        # Per-unit savings
        actual_kwh = float(dev_pwr.sum()) * INTERVAL_HOURS
        saved_kwh_dev = actual_kwh * IHL_SAVINGS_FACTOR
        unit_savings = {
            "kwh": round(saved_kwh_dev, 1),
            "co2": round(saved_kwh_dev * CO2_KG_PER_KWH, 1),
            "eur": round(saved_kwh_dev * EUR_PER_KWH, 2),
        }

        # Per-unit anomalies (capped at 3 per device)
        unit_anomalies: list[JsonDict] = []
        for a in alerts_by_dev.get(did, [])[:3]:
            ts_str = str(a.get("timestamp", ""))
            unit_anomalies.append(
                {
                    "id": f"{dev_cfg['hp_id']}-{a['type']}-{ts_str[:10]}",
                    "severity": "high" if a["severity"] == "critical" else a["severity"],
                    "type": a["type"].replace("_", " ").title(),
                    "message": a["message"],
                    "time": ts_str[11:16] or "—",
                    "resolved": False,
                }
            )
        combined_anomalies.extend(unit_anomalies)

        heat_pumps.append(
            {
                "id": dev_cfg["hp_id"],
                "deviceId": did,
                "name": f"IMBAT Orion {dev_cfg['hp_id']}",
                "model": "ORIO-025",
                "status": unit_st,
                "position": dev_cfg["hp_pos"],
                "power": {"current": pwr_now, "max": 25.0},
                "runtime": _uptime_str(uptime_s),
                "mode": op_mode,
                "temperature": {"supply": round(temp_sup, 1), "return": round(temp_ret, 1)},
                "airFlow": {"supply": round(fan_sup, 1), "return": round(fan_ret, 1)},
                "humidity": round(humidity, 1),
                "co2Ppm": round(co2_ppm, 0),
                "rawErrorRegisters": raw_regs,
                "savings": unit_savings,
                "anomalies": unit_anomalies,
            }
        )

    if not heat_pumps:
        rooms.append(
            _make_offline_room(
                {
                    "id": _ROOM_CFG["id"],
                    "name": _ROOM_CFG["name"],
                    "position": _ROOM_CFG["position"],
                    "size": _ROOM_CFG["size"],
                }
            )
        )
    else:
        # Room-level aggregates
        avg_temp = round(sum(all_room_temps) / len(all_room_temps), 1)
        avg_out = round(sum(all_out_temps) / len(all_out_temps), 1)

        # Worst-case room status
        _status_rank = {"error": 3, "warning": 2, "active": 1, "idle": 0}
        worst_st = max((hp["status"] for hp in heat_pumps), key=lambda s: _status_rank.get(s, 0))
        room_st = (
            "error" if worst_st == "error" else ("warning" if worst_st == "warning" else "optimal")
        )

        # ── 24-h temperature history: average across all devices ─────────────
        all_device_ids = [d["device_id"] for d in room_devices]
        all_ivs = ivs[ivs["device_id"].isin(all_device_ids)].copy()

        avg_temp_series = (
            all_ivs.groupby("interval_start_time")["median_temperature_in_celsius"].mean().tail(96)
        )

        # Outside temp from first device snapshots
        first_did = all_device_ids[0]
        first_snaps = df[df["device_id"] == first_did].set_index("last_seen_at")
        h_out_series = (
            pd.to_numeric(
                first_snaps.get("status_temperature_outside_in_celsius", pd.Series(dtype=float)),
                errors="coerce",
            )
            .resample("15min")
            .mean()
        )

        temp_history: list[dict] = []
        for ts_raw, avg_val in avg_temp_series.items():
            if pd.isna(avg_val):
                continue
            ts = pd.Timestamp(cast(Any, ts_raw))
            out_v = h_out_series.get(ts.floor("15min"), avg_out)
            temp_history.append(
                {
                    "time": ts.strftime("%H:%M"),
                    "temp": round(float(avg_val), 1),
                    "target": round(room_target, 1),
                    "outside": round(_safe_float(out_v, avg_out), 1),
                }
            )

        # ── 7-day energy history: sum across all devices ──────────────────────
        all_pwr = pwr[pwr["device_id"].isin(all_device_ids)].set_index("timestamp")
        daily_sum = (
            all_pwr.groupby("device_id")["power_draw_kw"]
            .resample("1D")
            .mean()
            .groupby(level=1)
            .sum()
        )
        energy_history: list[JsonDict] = []
        for ts_raw, avg_kw in daily_sum.tail(7).items():
            if pd.isna(avg_kw):
                continue
            ts = pd.Timestamp(cast(Any, ts_raw))
            actual_day = float(avg_kw) * 24
            baseline_day = actual_day / (1 - IHL_SAVINGS_FACTOR)
            energy_history.append(
                {
                    "day": ts.strftime("%a"),
                    "actual": round(actual_day, 1),
                    "baseline": round(baseline_day, 1),
                }
            )

        advice = _compute_advice(avg_temp, room_target, avg_out, all_ivs, heat_pumps[0]["mode"])

        rooms.append(
            {
                "id": _ROOM_CFG["id"],
                "name": _ROOM_CFG["name"],
                "position": _ROOM_CFG["position"],
                "size": _ROOM_CFG["size"],
                "status": room_st,
                "temperature": {
                    "current": avg_temp,
                    "target": round(room_target, 1),
                    "outside": avg_out,
                },
                "occupancy": {"current": 0, "max": 200},
                "advice": advice,
                "heatPumps": heat_pumps,
                "tempHistory": temp_history,
                "energyHistory": energy_history,
                "anomalies": combined_anomalies[:10],
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


# ── Schedule management ───────────────────────────────────────────────────────


@api_bp.get("/schedules")
def get_schedules() -> Response:
    """Return all stored events, optionally filtered by roomId."""
    room_id = request.args.get("roomId")
    events = schedule_manager.list_events(room_id)
    return jsonify(events)


@api_bp.post("/schedules")
def create_schedule_event() -> RouteResult:
    """
    Create a new room event.
    Body: { roomId, title, start (HH:MM), end (HH:MM),
            expectedStudents?, day?, recurrence? }
    """
    body = request.get_json(silent=True) or {}
    required = {"roomId", "title", "start", "end"}
    missing = required - body.keys()
    if missing:
        return _err(f"Missing fields: {', '.join(sorted(missing))}")
    try:
        event = schedule_manager.add_event(
            room_id=body["roomId"],
            title=body["title"],
            start=body["start"],
            end=body["end"],
            expected_students=int(body.get("expectedStudents", 50)),
            day=body.get("day"),
            recurrence=body.get("recurrence", "once"),
        )
        return jsonify(event), 201
    except ValueError as e:
        return _err(str(e))


@api_bp.delete("/schedules/<event_id>")
def delete_schedule_event(event_id: str) -> RouteResult:
    """Delete an event by id."""
    if schedule_manager.delete_event(event_id):
        return jsonify({"ok": True})
    return _err(f"Event '{event_id}' not found", 404)


@api_bp.patch("/schedules/<event_id>")
def patch_schedule_event(event_id: str) -> RouteResult:
    """Partially update an event (e.g. roomId after optimization apply)."""
    body = request.get_json(silent=True) or {}
    updated = schedule_manager.update_event(event_id, **body)
    if updated:
        return jsonify(updated)
    return _err(f"Event '{event_id}' not found", 404)


@api_bp.get("/schedules/energy-windows")
def schedule_energy_windows() -> Response:
    """
    For each stored event return:
      preheatStart   - when to turn on heat pump (HH:MM)
      eventStart     - lecture start
      eventEnd       - lecture end
      windDownTime   - when setpoint drops back to unoccupied level (HH:MM)
      leadMinutes    - computed preheat lead time
      predictedMode  - HEAT / COOL / AUTO
      setpointCelsius

    Pre-heat: based on outdoor temp + comfort_setpoint formula.
    Wind-down: eventEnd + WIND_DOWN_BUFFER_MINUTES (default 15 min).
    """
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    windows = schedule_manager.compute_energy_windows(lat=lat, lon=lon)
    return jsonify(
        {
            "windows": windows,
            "windDownBufferMinutes": schedule_manager.WIND_DOWN_BUFFER_MINUTES,
            "note": (
                "preheatStart: turn on heat pump this early. "
                "windDownTime: drop to unoccupied setpoint after this time. "
                "Tune WIND_DOWN_BUFFER_MINUTES in schedule/manager.py."
            ),
        }
    )


# ── Schedule optimization ─────────────────────────────────────────────────────


@api_bp.get("/optimization/suggest")
def optimization_suggest() -> Response:
    """
    Analyze current schedule and return a consolidation suggestion.
    Finds two events in different rooms with overlapping times where
    combined attendance fits in one room, yielding energy savings.

    Returns { suggestion: {...} | null }.
    """
    events = schedule_manager.list_events()
    suggestion = optimizer.suggest_consolidation(events)
    return jsonify({"suggestion": suggestion})


@api_bp.post("/optimization/apply")
def optimization_apply() -> RouteResult:
    """
    Apply an accepted consolidation suggestion.
    Body: { moveEventId, toRoomId }

    Updates the event's roomId in the schedule store.
    """
    body = request.get_json(silent=True) or {}
    event_id = body.get("moveEventId")
    to_room = body.get("toRoomId")
    if not event_id or not to_room:
        return _err("'moveEventId' and 'toRoomId' are required")

    updated = schedule_manager.update_event(event_id, roomId=to_room)
    if not updated:
        return _err(f"Event '{event_id}' not found", 404)
    return jsonify({"ok": True, "updatedEvent": updated})


# ── Enhanced technician contact ───────────────────────────────────────────────


@api_bp.post("/anomaly/contact-technician")
def contact_technician() -> Response:
    """
    Log a rich technician notification that bundles:
    - alert info (severity, type, message)
    - latest sensor readings for the affected device
    - parsed error register descriptions
    - recommended diagnostic steps

    In production: integrate with PagerDuty / Twilio / SMTP here.
    Extension point: replace the log append with an HTTP call to your
    notification provider and store the delivery receipt.
    """
    body = request.get_json(silent=True) or {}
    device_id = body.get("deviceId", "")
    alert_type = body.get("alertType", "")
    severity = body.get("severity", "warning")
    message = body.get("message", "")

    # Fetch latest snapshot for diagnostic context
    diagnostics: JsonDict = {}
    try:
        snap_df = loader.snapshots("cooling")
        dev_snaps = snap_df[snap_df["device_id"] == device_id]
        if not dev_snaps.empty:
            latest = dev_snaps.iloc[-1].to_dict()
            diagnostics = {
                "roomTemp": latest.get("status_temperature_in_celsius"),
                "supplyTemp": latest.get("status_temperature_supply_in_celsius"),
                "returnTemp": latest.get("status_temperature_return_in_celsius"),
                "outsideTemp": latest.get("status_temperature_outside_in_celsius"),
                "humidity": latest.get("status_humidity_in_percent"),
                "co2Ppm": latest.get("status_carbon_dioxide_in_ppm"),
                "lowPressure": latest.get("status_low_pressure_in_bar"),
                "highPressure": latest.get("status_high_pressure_in_bar"),
                "errorRegs": latest.get("status_error_registers"),
                "alarmActive": latest.get("status_is_alarm_active"),
                "compressor": latest.get("status_is_compressor_active"),
            }
    except Exception as exc:
        LOGGER.debug("Unable to load technician diagnostic snapshot", exc_info=exc)

    # Compile suggested diagnostic steps based on alert type
    diagnostic_steps: list[str] = []
    at = alert_type.upper()
    if "PRESSURE" in at:
        diagnostic_steps += [
            "Check refrigerant charge level.",
            "Inspect expansion valve and filter.",
            "Verify that outdoor coil is not iced over.",
        ]
    if "SUPPLY_RETURN" in at:
        diagnostic_steps += [
            "Check compressor operation — if supply ≈ return, compressor may not be running.",
            "Inspect duct connections for disconnection or blockage.",
        ]
    if "ERROR_REGISTER" in at or "ALARM" in at:
        diagnostic_steps += [
            "Read full alarm register via Modbus (registers 1901-1904).",
            "Check display panel on unit for active fault code.",
        ]
    if not diagnostic_steps:
        diagnostic_steps = ["Inspect unit visually and check fault log on display."]

    entry: JsonDict = {
        "id": len(_notification_log) + 1,
        "timestamp": datetime.now(UTC).isoformat(),
        "deviceId": device_id,
        "unitId": body.get("unitId", device_id),
        "roomName": body.get("roomName", "Main Space"),
        "severity": severity,
        "alertType": alert_type,
        "message": message,
        "diagnostics": diagnostics,
        "diagnosticSteps": diagnostic_steps,
        "status": "logged",
        "note": (
            "In production: POST to PagerDuty/Twilio/SMTP with this payload. "
            "The 'diagnostics' field contains the last known sensor readings."
        ),
    }
    _notification_log.append(entry)
    return jsonify({"ok": True, "notification": entry, "totalSent": len(_notification_log)})
