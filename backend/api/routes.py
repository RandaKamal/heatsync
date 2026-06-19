from flask import Blueprint, jsonify, request
from api.weather import fetch_forecast, fetch_current, DEFAULT_LAT, DEFAULT_LON
import data.loader as loader
import impact.calculator as impact
import prediction.predictor as predictor
import anomaly.detector as detector
import control.controller as controller
import comfort.model as comfort

api_bp = Blueprint("api", __name__, url_prefix="/api")

SPACE_ID = "3dbed10b-9e88-4163-916d-3182e2ecc69f"


# ── helpers ──────────────────────────────────────────────────────────────────

def _err(msg: str, code: int = 400):
    return jsonify({"error": msg}), code


# ── health ────────────────────────────────────────────────────────────────────

@api_bp.get("/health")
def health():
    return jsonify({"status": "ok"})


# ── weather ───────────────────────────────────────────────────────────────────

@api_bp.get("/weather/forecast")
def weather_forecast():
    """7-day hourly + daily forecast. Query: lat, lon, days (1-16)."""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    days = max(1, min(int(request.args.get("days", 7)), 16))
    return jsonify(fetch_forecast(lat, lon, days))


@api_bp.get("/weather/current")
def weather_current():
    """Current conditions (nearest forecast hour to now)."""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(fetch_current(lat, lon))


# ── devices ───────────────────────────────────────────────────────────────────

@api_bp.get("/devices")
def list_devices():
    """All devices with 3-D position and latest snapshot per window."""
    devs = loader.devices().to_dict(orient="records")
    positions = controller.DEVICE_POSITIONS
    for d in devs:
        did = d["device_id"]
        d["position"] = positions.get(did, {})
    return jsonify(devs)


@api_bp.get("/devices/<device_id>/snapshots")
def device_snapshots(device_id: str):
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
def device_power(device_id: str):
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
def space_events_all():
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
def impact_summary():
    """
    Energy saved (kWh), cost saved (€), CO2 saved (kg) — both windows + total.
    """
    return jsonify(impact.summary())


@api_bp.get("/impact/by-device")
def impact_by_device():
    """Per-device savings breakdown."""
    return jsonify(impact.by_device())


@api_bp.get("/impact/timeline")
def impact_timeline():
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
def control_status():
    """Current HVAC control state including all device overrides."""
    return jsonify(controller.get_status())


@api_bp.post("/control/mode")
def control_mode():
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
def control_setpoint():
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
def control_device_toggle(device_id: str):
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
def control_device_setpoint(device_id: str):
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
def control_prediction():
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
def prediction_schedule():
    """
    Recommended start times for all upcoming events in the next 7 days,
    based on weather forecast and historical heating/cooling rates.
    """
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(predictor.schedule(lat, lon))


@api_bp.get("/prediction/preheat")
def prediction_preheat():
    """Should a preheat/precool action start right now?"""
    lat = float(request.args.get("lat", DEFAULT_LAT))
    lon = float(request.args.get("lon", DEFAULT_LON))
    return jsonify(predictor.preheat_now(lat, lon))


# ── comfort ───────────────────────────────────────────────────────────────────

@api_bp.get("/comfort/current")
def comfort_current():
    """
    Live thermal comfort snapshot using latest sensor data from the most
    recent device snapshot (or explicit query params for demo use).

    Query params (all optional — defaults from latest snapshot):
      ta   float  air temperature (°C)
      rh   float  relative humidity (%)
      occ  int    estimated room occupancy (persons)
    """
    # Try to pull live values from the latest snapshot in the cooling window
    # (most recent data we have); fall back to query params or sensible defaults
    default_ta = 21.0
    default_rh = 45.0
    try:
        snap = loader.snapshots("cooling")
        latest = snap.sort_values("last_seen_at").iloc[-1]
        default_ta = float(latest.get("status_temperature_in_celsius", 21.0))
        default_rh = float(latest.get("status_humidity_in_percent", 45.0))
    except Exception:
        pass

    from datetime import datetime
    month = datetime.now().month
    ta = float(request.args.get("ta", default_ta))
    rh = float(request.args.get("rh", default_rh))
    occ = int(request.args.get("occ", 30))

    return jsonify(comfort.comfort_status(ta=ta, rh=rh, month=month, occupancy=occ))


@api_bp.get("/comfort/setpoint")
def comfort_setpoint_for_month():
    """
    Seasonal comfort setpoint for a given month and occupancy.
    Query: month (1-12, default current), occupancy (int, default 0)
    """
    from datetime import datetime
    month = int(request.args.get("month", datetime.now().month))
    occ = int(request.args.get("occupancy", 0))
    return jsonify({
        "month": month,
        "occupancy": occ,
        "clothing_insulation_clo": comfort.seasonal_clo(month),
        "comfort_setpoint_celsius": comfort.comfort_setpoint(month, occ),
        "mold_absolute_min_celsius": comfort.MOLD_ABSOLUTE_MIN_CELSIUS,
        "mold_safe_min_celsius": comfort.MOLD_SAFE_MIN_CELSIUS,
        "max_event_power_fraction": comfort.MAX_EVENT_POWER_FRACTION,
    })


@api_bp.get("/comfort/holidays")
def comfort_holidays():
    """
    Bayern public holidays in the next N days (no occupancy → unoccupied setpoint).
    Query: days (default 60)
    """
    days = int(request.args.get("days", 60))
    return jsonify(comfort.upcoming_holidays(days))


# ── anomaly ───────────────────────────────────────────────────────────────────

@api_bp.get("/anomaly/alerts")
def anomaly_alerts():
    """
    All detected anomalies.
    Query: window (heating|cooling, default heating)
    """
    window = request.args.get("window", "heating")
    if window not in ("heating", "cooling"):
        return _err("window must be 'heating' or 'cooling'")
    return jsonify(detector.summary(window))
