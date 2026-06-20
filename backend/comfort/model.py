"""
Thermal comfort model — ISO 7730 / ASHRAE Standard 55.

Covers:
  1. PMV/PPD  — Predicted Mean Vote / Predicted Percentage Dissatisfied
  2. Seasonal clothing (clo) — people wear different clothes in different seasons
  3. Comfort setpoint — dynamic target temperature derived from season + occupancy
  4. Mold prevention — minimum temperature that keeps walls above dew point (DIN 4108-2)
  5. Noise limit — max heat pump power fraction during occupied events
  6. Bayern public holidays — no occupancy on Feiertage → keep at unoccupied setpoint

ISO 7730 clothing insulation (clo) by season:
  Winter  (Dec-Feb) : 1.0 clo  heavy trousers, sweater, indoor jacket
  Spring  (Mar-May) : 0.7 clo  light trousers, long-sleeve shirt
  Summer  (Jun-Aug) : 0.5 clo  light trousers, short-sleeve shirt
  Autumn  (Sep-Nov) : 0.7 clo  same as spring

Comfort operative temperature for PMV ≈ 0 (by season, 1.2 met seated):
  Winter  : 20 °C
  Spring  : 21 °C
  Summer  : 24 °C
  Autumn  : 21 °C

Mold prevention (DIN 4108-2 / German building standard):
  MOLD_ABSOLUTE_MIN : 12 °C  — below this mold growth risk is high
  MOLD_SAFE_MIN     : 14 °C  — recommended floor for typical German masonry walls

Noise limit:
  Commercial heat pumps exceed comfortable lecture-hall noise (~55 dB(A)) above
  ~60 % of rated capacity. We cap event-time power at MAX_EVENT_POWER_FRACTION.

Occupancy effect on setpoint:
  Each person generates ~80 W of sensible heat.
  50 occupants ≈ 4 kW, enough to raise a mid-size room by ~0.5-1 °C.
  We lower the heating setpoint (or raise the cooling setpoint) proportionally,
  capped at 1.5 °C adjustment for any occupancy.
"""

import math
from datetime import date, timedelta

# ── constants ─────────────────────────────────────────────────────────────────

MOLD_ABSOLUTE_MIN_CELSIUS = 12.0  # hard floor — never go below this
MOLD_SAFE_MIN_CELSIUS = 14.0  # recommended unoccupied minimum

MAX_EVENT_POWER_FRACTION = 0.60  # noise ceiling during occupied events
MAX_OCCUPANCY_SETPOINT_ADJ = 1.5  # °C max setpoint shift from body heat
_FCL_ICL_THRESHOLD = 0.078
_PMV_CONVERGENCE_TOLERANCE = 0.001
_PMV_COOL_THRESHOLD = -0.5
_PMV_WARM_THRESHOLD = 0.5

# Seasonal clo values (ISO 7730 / ASHRAE 55)
_CLO_BY_SEASON = {
    "winter": 1.0,
    "spring": 0.7,
    "summer": 0.5,
    "autumn": 0.7,
}

# Neutral operative temperature for each season (seated lecture, 1.2 met)
_COMFORT_TEMP_BY_SEASON = {
    "winter": 20.0,
    "spring": 21.0,
    "summer": 24.0,
    "autumn": 21.0,
}


def _season(month: int) -> str:
    if month in (12, 1, 2):
        return "winter"
    if month in (3, 4, 5):
        return "spring"
    if month in (6, 7, 8):
        return "summer"
    return "autumn"


def seasonal_clo(month: int) -> float:
    return _CLO_BY_SEASON[_season(month)]


def comfort_setpoint(month: int, occupancy: int = 0) -> float:
    """
    Seasonal comfort target temperature adjusted for occupancy.
    Body heat from occupants lets us lower the heating setpoint (or raise
    the cooling setpoint) — the room partially heats/cools itself.
    """
    base = _COMFORT_TEMP_BY_SEASON[_season(month)]
    # 100 occupants → full MAX_OCCUPANCY_SETPOINT_ADJ reduction
    adj = min(occupancy / 100.0, 1.0) * MAX_OCCUPANCY_SETPOINT_ADJ
    return round(base - adj, 1)  # lower setpoint = less energy needed


# ── PMV / PPD (ISO 7730 Fanger model) ────────────────────────────────────────


def pmv(
    ta: float,  # air temperature (°C)
    tr: float,  # mean radiant temperature (°C) — use ta when unknown
    vel: float,  # relative air velocity (m/s)
    rh: float,  # relative humidity (%)
    met: float = 1.2,  # metabolic rate (met); 1.2 = seated lecture
    clo: float = 0.7,  # clothing insulation (clo)
) -> float:
    """
    ISO 7730 Predicted Mean Vote.
    Returns a value in [-3, +3]:
      -3 = cold, -2 = cool, -1 = slightly cool
       0 = neutral
      +1 = slightly warm, +2 = warm, +3 = hot
    """
    pa = rh * 10 * math.exp(16.6536 - 4030.18 / (ta + 235))  # water vapour (Pa)
    icl = 0.155 * clo  # m²K/W
    m = met * 58.15  # W/m²
    mw = m  # (no external work)
    fcl = 1.05 + 0.645 * icl if icl > _FCL_ICL_THRESHOLD else 1 + 1.29 * icl

    hcf = 12.1 * math.sqrt(vel)

    # All temperatures in °C; convert to K (add 273) only inside radiation terms.
    # Initial clothing surface temperature (°C)
    tcla = ta + (35.5 - ta) / (3.5 * (6.45 * icl + 0.1))
    hc = hcf  # will be updated each iteration
    for _ in range(150):
        hc = max(hcf, 2.38 * abs(tcla - ta) ** 0.25)
        tcl_new = (
            35.7
            - 0.028 * mw
            - icl * (3.96e-8 * fcl * ((tcla + 273) ** 4 - (tr + 273) ** 4) + fcl * hc * (tcla - ta))
        )
        if abs(tcl_new - tcla) < _PMV_CONVERGENCE_TOLERANCE:
            tcla = tcl_new
            break
        tcla = (tcla + tcl_new) / 2
    tcl = tcla

    hl1 = 3.05e-3 * (5733 - 6.99 * mw - pa)
    hl2 = max(0.0, 0.42 * (mw - 58.15))
    hl3 = 1.7e-5 * m * (5867 - pa)
    hl4 = 0.0014 * m * (34 - ta)
    hl5 = 3.96e-8 * fcl * ((tcl + 273) ** 4 - (tr + 273) ** 4)
    hl6 = fcl * hc * (tcl - ta)

    ts = 0.303 * math.exp(-0.036 * m) + 0.028
    val = ts * (mw - hl1 - hl2 - hl3 - hl4 - hl5 - hl6)
    return round(max(-3.0, min(3.0, val)), 2)


def ppd(pmv_val: float) -> float:
    """ISO 7730 Predicted Percentage Dissatisfied (%)."""
    return round(100 - 95 * math.exp(-0.03353 * pmv_val**4 - 0.2179 * pmv_val**2), 1)


def comfort_label(pmv_val: float) -> str:
    thresholds = [
        (-2.5, "cold"),
        (-1.5, "cool"),
        (-0.5, "slightly cool"),
        (0.5, "neutral"),
        (1.5, "slightly warm"),
        (2.5, "warm"),
    ]
    for limit, label in thresholds:
        if pmv_val < limit:
            return label
    return "hot"


def comfort_status(
    ta: float,
    rh: float,
    month: int,
    occupancy: int = 30,
    vel: float = 0.15,
) -> dict:
    """
    Full comfort snapshot for a room at the current moment.
    Returns PMV, PPD, seasonal setpoint, mold risk, and recommendations.
    """
    clo = seasonal_clo(month)
    pmv_val = pmv(ta=ta, tr=ta, vel=vel, rh=rh, met=1.2, clo=clo)
    ppd_val = ppd(pmv_val)
    target = comfort_setpoint(month, occupancy)
    season = _season(month)

    mold_risk = ta < MOLD_SAFE_MIN_CELSIUS
    mold_critical = ta < MOLD_ABSOLUTE_MIN_CELSIUS

    recommendations = []
    if mold_critical:
        recommendations.append(
            f"CRITICAL: Room temperature {ta}°C is below mold-prevention minimum "
            f"({MOLD_ABSOLUTE_MIN_CELSIUS}°C). Heat immediately."
        )
    elif mold_risk:
        recommendations.append(
            f"WARNING: Room temperature {ta}°C is below recommended mold-safe "
            f"minimum ({MOLD_SAFE_MIN_CELSIUS}°C)."
        )
    if pmv_val < _PMV_COOL_THRESHOLD:
        recommendations.append(
            f"Room is {comfort_label(pmv_val)} (PMV={pmv_val}). "
            f"Increase temperature toward {target}°C."
        )
    elif pmv_val > _PMV_WARM_THRESHOLD:
        recommendations.append(
            f"Room is {comfort_label(pmv_val)} (PMV={pmv_val}). "
            f"Decrease temperature toward {target}°C."
        )
    else:
        recommendations.append("Thermal comfort is within acceptable range.")

    return {
        "air_temp_celsius": ta,
        "relative_humidity_percent": rh,
        "season": season,
        "clothing_insulation_clo": clo,
        "occupancy": occupancy,
        "pmv": pmv_val,
        "ppd_percent": ppd_val,
        "comfort_label": comfort_label(pmv_val),
        "comfort_setpoint_celsius": target,
        "mold_safe_min_celsius": MOLD_SAFE_MIN_CELSIUS,
        "mold_absolute_min_celsius": MOLD_ABSOLUTE_MIN_CELSIUS,
        "mold_risk": mold_risk,
        "mold_critical": mold_critical,
        "max_event_power_fraction": MAX_EVENT_POWER_FRACTION,
        "recommendations": recommendations,
    }


# ── Bayern public holidays ────────────────────────────────────────────────────


def _easter(year: int) -> date:
    """Anonymous Gregorian algorithm (Meeus/Jones/Butcher)."""
    a = year % 19
    b, c = divmod(year, 100)
    d, e = divmod(b, 4)
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = divmod(c, 4)
    ll = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * ll) // 451
    month, day = divmod(h + ll - 7 * m + 114, 31)
    return date(year, month, day + 1)


def _bavaria_holidays(year: int) -> dict[date, str]:
    easter = _easter(year)
    fixed = {
        date(year, 1, 1): "Neujahr",
        date(year, 1, 6): "Heilige Drei Könige",
        date(year, 5, 1): "Tag der Arbeit",
        date(year, 8, 15): "Mariä Himmelfahrt",
        date(year, 10, 3): "Tag der Deutschen Einheit",
        date(year, 11, 1): "Allerheiligen",
        date(year, 12, 25): "1. Weihnachtstag",
        date(year, 12, 26): "2. Weihnachtstag",
    }
    variable = {
        easter - timedelta(days=2): "Karfreitag",
        easter + timedelta(days=1): "Ostermontag",
        easter + timedelta(days=39): "Christi Himmelfahrt",
        easter + timedelta(days=50): "Pfingstmontag",
        easter + timedelta(days=60): "Fronleichnam",
    }
    return {**fixed, **variable}


def is_holiday_bavaria(d: date) -> str | None:
    """Returns the holiday name if d is a Bayern Feiertag, else None."""
    return _bavaria_holidays(d.year).get(d)


def upcoming_holidays(days: int = 30) -> list[dict]:
    today = date.today()
    result = []
    for offset in range(days + 1):
        d = today + timedelta(days=offset)
        name = is_holiday_bavaria(d)
        if name:
            result.append({"date": d.isoformat(), "name": name, "days_until": offset})
    return result
