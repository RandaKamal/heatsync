"""
In-memory HVAC control state.

Supports:
  - Global mode: AUTO | HEAT | COOL | OFF
  - Per-device overrides (enable/disable, individual setpoint)
  - Prediction toggle
  - Mold prevention floor (hard constraint — user cannot set below this)
  - Noise limit: max power fraction during occupied events
"""

from datetime import UTC, datetime

from comfort.model import MAX_EVENT_POWER_FRACTION, MOLD_ABSOLUTE_MIN_CELSIUS
from data.loader import devices as load_devices

_DEVICE_IDS = [
    "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",
    "1c893f75-4599-4402-9d4c-1017aa858fa8",
    "e72fea56-abe7-4d3f-a0ed-1e6b6c462157",
    "930f3621-05df-4574-9270-9d994c5b716c",
]

# Spatial positions for the 3-D building map (metres, origin = building centre)
DEVICE_POSITIONS = {
    "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773": {"x": -12, "y": 8, "z": 3, "section": "Wing A"},
    "1c893f75-4599-4402-9d4c-1017aa858fa8": {"x": 12, "y": 8, "z": 3, "section": "Wing B"},
    "e72fea56-abe7-4d3f-a0ed-1e6b6c462157": {"x": -12, "y": -8, "z": 3, "section": "Wing C"},
    "930f3621-05df-4574-9270-9d994c5b716c": {"x": 12, "y": -8, "z": 3, "section": "Main Hall"},
}

_state: dict = {
    "mode": "AUTO",
    "setpoint_celsius": 21.0,
    "prediction_enabled": True,
    # Comfort constraints (read-only from user perspective — derived from comfort model)
    "mold_min_celsius": MOLD_ABSOLUTE_MIN_CELSIUS,
    "max_event_power_fraction": MAX_EVENT_POWER_FRACTION,
    "updated_at": datetime.now(UTC).isoformat(),
    "devices": {did: {"enabled": True, "setpoint_override": None} for did in _DEVICE_IDS},
}

VALID_MODES = {"AUTO", "HEAT", "COOL", "OFF"}
MAX_SETPOINT_CELSIUS = 30.0


def _validate_setpoint(celsius: float) -> float:
    """Enforce mold floor and upper limit."""
    if celsius < MOLD_ABSOLUTE_MIN_CELSIUS:
        raise ValueError(
            f"Setpoint {celsius}°C is below mold prevention minimum "
            f"({MOLD_ABSOLUTE_MIN_CELSIUS}°C). The room must stay above this "
            "to prevent condensation and mold growth."
        )
    if celsius > MAX_SETPOINT_CELSIUS:
        raise ValueError("Setpoint cannot exceed 30°C.")
    return celsius


def get_status() -> dict:
    devs = load_devices()
    label_map = devs.set_index("device_id")["label"].to_dict()
    device_list = []
    for did, ds in _state["devices"].items():
        device_list.append(
            {
                "device_id": did,
                "device_name": label_map.get(did, did),
                "enabled": ds["enabled"],
                "setpoint_celsius": ds["setpoint_override"] or _state["setpoint_celsius"],
                "setpoint_override_active": ds["setpoint_override"] is not None,
                "position": DEVICE_POSITIONS.get(did, {}),
            }
        )

    return {
        "mode": _state["mode"],
        "setpoint_celsius": _state["setpoint_celsius"],
        "prediction_enabled": _state["prediction_enabled"],
        "constraints": {
            "mold_min_celsius": _state["mold_min_celsius"],
            "max_event_power_fraction": _state["max_event_power_fraction"],
            "note": (
                f"Setpoint cannot go below {_state['mold_min_celsius']}°C "
                "(mold prevention). Heat pump is capped at "
                f"{int(_state['max_event_power_fraction'] * 100)}% power during events "
                "to limit noise."
            ),
        },
        "updated_at": _state["updated_at"],
        "devices": device_list,
    }


def set_mode(mode: str) -> dict:
    if mode not in VALID_MODES:
        raise ValueError(f"Invalid mode '{mode}'. Must be one of {VALID_MODES}.")
    _state["mode"] = mode
    _state["updated_at"] = datetime.now(UTC).isoformat()
    return get_status()


def set_setpoint(celsius: float) -> dict:
    _validate_setpoint(celsius)
    _state["setpoint_celsius"] = celsius
    _state["updated_at"] = datetime.now(UTC).isoformat()
    return get_status()


def toggle_device(device_id: str, enabled: bool) -> dict:
    if device_id not in _state["devices"]:
        raise ValueError(f"Unknown device_id: {device_id}")
    _state["devices"][device_id]["enabled"] = enabled
    _state["updated_at"] = datetime.now(UTC).isoformat()
    return get_status()


def set_device_setpoint(device_id: str, celsius: float | None) -> dict:
    """Per-device setpoint override. Pass None to clear."""
    if device_id not in _state["devices"]:
        raise ValueError(f"Unknown device_id: {device_id}")
    if celsius is not None:
        _validate_setpoint(celsius)
    _state["devices"][device_id]["setpoint_override"] = celsius
    _state["updated_at"] = datetime.now(UTC).isoformat()
    return get_status()


def toggle_prediction(enabled: bool) -> dict:
    _state["prediction_enabled"] = enabled
    _state["updated_at"] = datetime.now(UTC).isoformat()
    return get_status()
