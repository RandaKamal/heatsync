# ruff: noqa: PLR2004
import os
import sys

import nbformat
import numpy as np
import pytest
import scipy.optimize
from nbconvert.preprocessors import ExecutePreprocessor

# Ensure the backend directory is in the path
backend_path = os.path.abspath(os.path.dirname(os.path.dirname(__file__)))
if backend_path not in sys.path:
    sys.path.append(backend_path)

from notebooks.utils import load_processed  # noqa: E402

SECONDS_PER_HOUR = 3_600.0
MAX_ABSOLUTE_TEMPERATURE = 1_000.0
UNSTABLE_OBJECTIVE_PENALTY = 1e12


def simulate_2r2c(
    params: np.ndarray,
    T_in_init: float,
    T_wall_init: float,
    T_out: np.ndarray,
    Q: np.ndarray,
    dt: float,
) -> np.ndarray:
    """Simulate indoor temperature for a discrete 2R2C model."""
    R_in, C_in, R_out, C_wall = params
    if np.any(np.asarray(params, dtype=float) <= 0):
        raise ValueError("2R2C parameters must all be positive.")

    dt_hours = dt / SECONDS_PER_HOUR
    n_steps = len(T_out)
    T_pred = np.empty(n_steps, dtype=float)
    T_indoor = float(T_in_init)
    T_wall = float(T_wall_init)
    T_pred[0] = T_indoor

    for k in range(n_steps - 1):
        indoor_delta = dt_hours / C_in * (((T_wall - T_indoor) / R_in) + Q[k])
        wall_delta = (
            dt_hours / C_wall * (((T_out[k] - T_wall) / R_out) - ((T_wall - T_indoor) / R_in))
        )
        T_indoor = T_indoor + indoor_delta
        T_wall = T_wall + wall_delta

        if not np.isfinite(T_indoor) or not np.isfinite(T_wall):
            T_pred[k + 1 :] = np.nan
            break

        # Guard against unstable candidate parameters dominating optimizer time.
        if abs(T_indoor) > MAX_ABSOLUTE_TEMPERATURE or abs(T_wall) > MAX_ABSOLUTE_TEMPERATURE:
            T_pred[k + 1 :] = np.nan
            break

        T_pred[k + 1] = T_indoor

    return T_pred


def simulate_thermostat(
    params: np.ndarray,
    T_in_init: float,
    T_wall_init: float,
    T_out: np.ndarray,
    T_setpoints: np.ndarray,
    Q_occ: np.ndarray,
    dt: float,
    Q_max: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Simulate thermal response and required HVAC power to maintain setpoints."""
    R_in, C_in, R_out, C_wall = params
    if np.any(np.asarray(params, dtype=float) <= 0):
        raise ValueError("2R2C parameters must all be positive.")
    if len(T_out) != len(T_setpoints) or len(T_out) != len(Q_occ):
        raise ValueError("Input arrays (T_out, T_setpoints, Q_occ) must have the same length.")
    if Q_max < 0:
        raise ValueError("Q_max must be non-negative.")

    dt_hours = dt / SECONDS_PER_HOUR
    n_steps = len(T_out)

    T_indoor = np.empty(n_steps, dtype=float)
    T_wall = np.empty(n_steps, dtype=float)
    Q_hvac = np.empty(n_steps, dtype=float)

    T_indoor[0] = T_in_init
    T_wall[0] = T_wall_init

    for k in range(n_steps - 1):
        T_target_next = T_setpoints[k + 1]

        # Required heat input to reach target
        Q_req = (
            (T_target_next - T_indoor[k]) * C_in / dt_hours
            - (T_wall[k] - T_indoor[k]) / R_in
            - Q_occ[k]
        )

        # Bounded by 0 (cannot cool) and Q_max (max heating capacity)
        Q_hvac[k] = np.clip(Q_req, 0.0, Q_max)

        # Propagate temperatures
        indoor_delta = dt_hours / C_in * (((T_wall[k] - T_indoor[k]) / R_in) + Q_hvac[k] + Q_occ[k])
        T_indoor[k + 1] = T_indoor[k] + indoor_delta

        wall_delta = (
            dt_hours
            / C_wall
            * (((T_out[k] - T_wall[k]) / R_out) - ((T_wall[k] - T_indoor[k]) / R_in))
        )
        T_wall[k + 1] = T_wall[k] + wall_delta

        if not np.isfinite(T_indoor[k + 1]) or not np.isfinite(T_wall[k + 1]):
            T_indoor[k + 1 :] = np.nan
            T_wall[k + 1 :] = np.nan
            Q_hvac[k:] = np.nan
            break

        if (
            abs(T_indoor[k + 1]) > MAX_ABSOLUTE_TEMPERATURE
            or abs(T_wall[k + 1]) > MAX_ABSOLUTE_TEMPERATURE
        ):
            T_indoor[k + 1 :] = np.nan
            T_wall[k + 1 :] = np.nan
            Q_hvac[k:] = np.nan
            break

    Q_hvac[-1] = 0.0
    return T_indoor, T_wall, Q_hvac


def calculate_occupancy_heat_gain(n_people: int, q_sensible_w: float) -> float:
    """Calculate occupancy heat gain in kW."""
    if n_people < 0:
        raise ValueError("Number of people cannot be negative.")
    if q_sensible_w < 0:
        raise ValueError("Sensible heat gain cannot be negative.")
    return n_people * (q_sensible_w / 1000.0)


def generate_occupancy_schedule(hour_of_day: np.ndarray, is_weekend: np.ndarray) -> np.ndarray:
    """Generate binary occupancy schedule based on time indicators."""
    n_steps = len(hour_of_day)
    occupied = np.zeros(n_steps, dtype=bool)
    for k in range(n_steps):
        hr = hour_of_day[k]
        if is_weekend[k] == 1:
            occupied[k] = (hr >= 9) and (hr < 22)
        else:
            occupied[k] = (hr >= 7) and (hr < 22)
    return occupied


def generate_setback_schedule(
    occupied: np.ndarray, is_weekend: np.ndarray, scenario: str
) -> np.ndarray:
    """Generate target setpoint schedule for baseline or setback scenarios."""
    n_steps = len(occupied)
    if scenario == "baseline":
        return np.full(n_steps, 21.0)
    elif scenario == "mild":
        return np.where(occupied, 21.0, 18.0)
    elif scenario == "deep":
        return np.where(occupied, 21.0, 16.0)
    elif scenario == "weekend":
        T_target = np.empty(n_steps, dtype=float)
        for k in range(n_steps):
            if is_weekend[k] == 1:
                T_target[k] = 17.0
            else:
                T_target[k] = 21.0 if occupied[k] else 16.0
        return T_target
    else:
        raise ValueError(f"Unknown scenario: {scenario}")


def detect_comfort_violations(
    T_in: np.ndarray, occupied: np.ndarray, T_min_occ: float = 20.0
) -> int:
    """Count comfort violations during occupied periods."""
    return int(np.sum((T_in < T_min_occ) & occupied))


def test_occupancy_heat_gain_calculation() -> None:
    """Verify occupancy heat-gain calculations with valid and invalid values."""
    assert calculate_occupancy_heat_gain(2, 75.0) == 0.15
    assert calculate_occupancy_heat_gain(0, 75.0) == 0.0

    # Negative tests
    with pytest.raises(ValueError):
        calculate_occupancy_heat_gain(-1, 75.0)
    with pytest.raises(ValueError):
        calculate_occupancy_heat_gain(2, -75.0)


def test_setback_schedule_generation() -> None:
    """Verify generated setpoint schedules match scheduled comfort requirements."""
    hour_of_day = np.arange(24)
    is_weekend_false = np.zeros(24, dtype=int)

    occupied_wkdy = generate_occupancy_schedule(hour_of_day, is_weekend_false)
    for hr in range(24):
        if 7 <= hr < 22:
            assert occupied_wkdy[hr]
        else:
            assert not occupied_wkdy[hr]

    is_weekend_true = np.ones(24, dtype=int)
    occupied_wknd = generate_occupancy_schedule(hour_of_day, is_weekend_true)
    for hr in range(24):
        if 9 <= hr < 22:
            assert occupied_wknd[hr]
        else:
            assert not occupied_wknd[hr]

    # Scenario Verification
    mild_schedule = generate_setback_schedule(occupied_wkdy, is_weekend_false, "mild")
    assert len(mild_schedule) == 24
    assert np.all(mild_schedule[occupied_wkdy] == 21.0)
    assert np.all(mild_schedule[~occupied_wkdy] == 18.0)

    deep_schedule = generate_setback_schedule(occupied_wkdy, is_weekend_false, "deep")
    assert len(deep_schedule) == 24
    assert np.all(deep_schedule[occupied_wkdy] == 21.0)
    assert np.all(deep_schedule[~occupied_wkdy] == 16.0)

    wknd_schedule = generate_setback_schedule(occupied_wknd, is_weekend_true, "weekend")
    assert len(wknd_schedule) == 24
    assert np.all(wknd_schedule == 17.0)

    # Negative test
    with pytest.raises(ValueError):
        generate_setback_schedule(occupied_wkdy, is_weekend_false, "invalid_scenario")


def test_comfort_violation_detection() -> None:
    """Verify violation counter correctly flags temperature deviations under comfort bounds."""
    occupied = np.ones(10, dtype=bool)
    T_in = np.array([21.0, 20.5, 19.5, 21.0, 18.0, 20.0, 22.0, 19.9, 20.1, 21.0])
    # 19.5, 18.0, and 19.9 are violations
    violations = detect_comfort_violations(T_in, occupied, T_min_occ=20.0)
    assert violations == 3

    # Mixed occupancy verification
    occupied_mix = np.array([True, True, False, True, False, True, True, True, True, True])
    # 19.5 (occupied=False) and 18.0 (occupied=False) should not count.
    # Only 19.9 is left as an occupied comfort violation.
    violations_mix = detect_comfort_violations(T_in, occupied_mix, T_min_occ=20.0)
    assert violations_mix == 1


def test_savings_positive_for_setback() -> None:
    """Verify setback strategies yield energy savings relative to baseline constant setpoint."""
    df = load_processed("heating")
    assert not df.empty

    device_id = df["device_id"].dropna().unique()[0]
    dev_df = df[df["device_id"] == device_id].copy()

    physical_cols = [
        "status_temperature_in_celsius",
        "outside_temperature",
        "power_draw_kw",
        "hour_of_day",
        "is_weekend",
    ]
    model_df = (
        dev_df[physical_cols]
        .rename(
            columns={
                "status_temperature_in_celsius": "T_in",
                "outside_temperature": "T_out",
                "power_draw_kw": "Q",
            }
        )
        .dropna()
    )

    # Replicate physical.py/notebook pattern: calibrate on first 300 rows
    cal_df = model_df.iloc[:300].copy()
    dt = 900.0

    T_in = cal_df["T_in"].to_numpy(dtype=float)
    T_out = cal_df["T_out"].to_numpy(dtype=float)
    Q = cal_df["Q"].to_numpy(dtype=float)

    T_wall_init = (T_in[0] + T_out[0]) / 2.0
    bounds = [(0.001, 50.0)] * 4

    def objective(params: np.ndarray) -> float:
        T_pred = simulate_2r2c(params, T_in[0], T_wall_init, T_out, Q, dt)
        if not np.all(np.isfinite(T_pred)):
            return UNSTABLE_OBJECTIVE_PENALTY
        return float(np.mean((T_pred - T_in) ** 2))

    np.random.seed(42)
    restart_results = []
    for _ in range(3):
        x0 = np.random.uniform(0.1, 25.0, size=4)
        result = scipy.optimize.minimize(
            objective,
            x0=x0,
            method="L-BFGS-B",
            bounds=bounds,
            options={"maxiter": 100, "ftol": 1e-6},
        )
        restart_results.append(result)

    best_result = min(restart_results, key=lambda res: res.fun)
    best_params = best_result.x

    assert best_result.fun < UNSTABLE_OBJECTIVE_PENALTY
    assert (best_params > 0).all()

    # Thermostat simulation
    hour_of_day = cal_df["hour_of_day"].to_numpy()
    is_weekend = cal_df["is_weekend"].to_numpy()
    occupied = generate_occupancy_schedule(hour_of_day, is_weekend)

    Q_occ = np.where(occupied, 0.15, 0.0)
    Q_max = float(cal_df["Q"].max())
    if Q_max <= 0.0:
        Q_max = 5.0

    T_in_init = T_in[0]

    # Baseline Simulation (Constant 21°C)
    T_setpoints_baseline = generate_setback_schedule(occupied, is_weekend, "baseline")
    _, _, Q_hvac_b = simulate_thermostat(
        best_params, T_in_init, T_wall_init, T_out, T_setpoints_baseline, Q_occ, dt, Q_max
    )
    baseline_kwh = np.sum(Q_hvac_b) * (dt / SECONDS_PER_HOUR)

    # Mild Night Setback (18°C/21°C)
    T_setpoints_mild = generate_setback_schedule(occupied, is_weekend, "mild")
    _, _, Q_hvac_m = simulate_thermostat(
        best_params, T_in_init, T_wall_init, T_out, T_setpoints_mild, Q_occ, dt, Q_max
    )
    mild_kwh = np.sum(Q_hvac_m) * (dt / SECONDS_PER_HOUR)

    # Deep Night Setback (16°C/21°C)
    T_setpoints_deep = generate_setback_schedule(occupied, is_weekend, "deep")
    _, _, Q_hvac_d = simulate_thermostat(
        best_params, T_in_init, T_wall_init, T_out, T_setpoints_deep, Q_occ, dt, Q_max
    )
    deep_kwh = np.sum(Q_hvac_d) * (dt / SECONDS_PER_HOUR)

    # Assert that setback strategies save energy (or are equal, e.g. mild_kwh <= baseline_kwh)
    assert mild_kwh <= baseline_kwh
    assert deep_kwh <= baseline_kwh
    assert deep_kwh <= mild_kwh


def test_simulate_thermostat_invalid_inputs() -> None:
    """Verify error pathways for invalid parameters or array dimensions in thermostat simulation."""
    params = np.array([10.0, 5.0, 10.0, 15.0])

    # Negative parameter values
    with pytest.raises(ValueError):
        simulate_thermostat(
            np.array([-1.0, 5.0, 10.0, 15.0]),
            20.0,
            15.0,
            np.ones(5),
            np.ones(5),
            np.zeros(5),
            900.0,
            5.0,
        )

    # Mismatched input array lengths
    with pytest.raises(ValueError):
        simulate_thermostat(params, 20.0, 15.0, np.ones(5), np.ones(4), np.zeros(5), 900.0, 5.0)

    # Negative Q_max
    with pytest.raises(ValueError):
        simulate_thermostat(params, 20.0, 15.0, np.ones(5), np.ones(5), np.zeros(5), 900.0, -1.0)


def test_notebook_execution() -> None:
    """Asserts that the energy controls and optimization notebook runs without errors."""
    notebook_path = "backend/notebooks/06_energy_controls.ipynb"
    assert os.path.exists(notebook_path), f"Notebook not found at: {notebook_path}"

    with open(notebook_path, encoding="utf-8") as f:
        nb = nbformat.read(f, as_version=4)

    ep = ExecutePreprocessor(timeout=300, kernel_name="python3")
    ep.preprocess(nb, {"metadata": {"path": "backend/notebooks"}})
