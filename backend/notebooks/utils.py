"""
Shared utilities for data preprocessing, clock alignment, and feature engineering.
"""

import logging
import pathlib
import warnings
import json
from typing import Any

import joblib
import pandas as pd
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Dynamically resolve project root relative to this file (backend/notebooks/utils.py)
PROJECT_ROOT = pathlib.Path(__file__).resolve().parent.parent.parent

WINDOW_DIRS: dict[str, str] = {
    "heating": "backend/data/heating_2026-03-30_to_2026-04-05",
    "cooling": "backend/data/cooling_2026-05-25_to_2026-05-31",
}

REQUIRED_COLS: dict[str, list[str]] = {
    "snapshots": ["device_id", "last_seen_at", "status_temperature_outside_in_celsius"],
    "intervals": ["device_id", "space_uuid", "interval_start_time", "interval_end_time"],
    "power_draw": ["device_id", "timestamp", "power_draw_kw"],
    "space_events": ["starts_at", "ends_at"],
}

SNAPSHOTS_OPTIONAL: list[str] = [
    "id",
    "space_id",
    "status_is_enabled",
    "status_operation_mode",
    "status_target_temperature_in_celsius",
    "status_temperature_in_celsius",
    "status_humidity_in_percent",
    "status_carbon_dioxide_in_ppm",
    "status_voc_in_micrograms_per_cubic_meter",
    "status_temperature_supply_in_celsius",
    "status_temperature_return_in_celsius",
    "status_air_flow_supply_in_percent",
    "status_air_flow_return_in_percent",
    "status_is_heating_required",
    "status_is_cooling_required",
    "status_heat_threshold_in_celsius",
    "status_cool_threshold_in_celsius",
    "status_is_compressor_active",
    "status_is_defrost_active",
    "status_low_pressure_in_bar",
    "status_high_pressure_in_bar",
    "status_low_pressure_highest_in_bar",
    "status_high_pressure_highest_in_bar",
    "status_fan_speed_in_rpm",
    "status_compressor_frequency_in_hertz",
    "status_daily_shutdown_is_enabled",
    "status_daily_shutdown_start_time",
    "status_daily_shutdown_end_time",
    "status_daily_shutdown_air_flow_supply_in_percent",
    "status_daily_shutdown_air_flow_return_in_percent",
    "status_is_status_active",
    "status_is_alarm_active",
    "status_error_registers",
    "status_is_network_connected",
    "status_has_network_error",
    "status_network_error_count",
    "status_system_uptime_in_seconds",
    "firmware_version",
    "payload_version",
]

INTERVALS_OPTIONAL: list[str] = [
    "time_range",
    "operation_mode",
    "was_adjusting_temperature",
    "target_temperature_in_celsius",
    "median_temperature_in_celsius",
    "median_return_temperature_in_celsius",
    "median_humidity_in_percent",
    "median_carbon_dioxide_in_ppm",
    "low_pressure_highest_in_bar",
    "high_pressure_highest_in_bar",
]

POWER_DRAW_OPTIONAL: list[str] = ["device_name"]

SPACE_EVENTS_OPTIONAL: list[str] = ["name", "type", "source"]

# Constants for quality thresholds and feature engineering to avoid magic values
MAX_INTERPOLATION_GAP = 2
WEEKEND_START_DAY = 5
THRESHOLD_REQUIRED = 0.5
SECONDS_PER_HOUR = 3_600.0


def validate_columns(df: pd.DataFrame, file_type: str, file_path: str) -> None:
    """
    Validate that all required columns are present in the DataFrame.
    Warn if any optional columns are missing.
    """
    reqs = REQUIRED_COLS[file_type]
    missing_reqs = [col for col in reqs if col not in df.columns]
    if missing_reqs:
        raise ValueError(
            f"File '{file_path}' of type '{file_type}' is missing required columns: {missing_reqs}"
        )

    opts = {
        "snapshots": SNAPSHOTS_OPTIONAL,
        "intervals": INTERVALS_OPTIONAL,
        "power_draw": POWER_DRAW_OPTIONAL,
        "space_events": SPACE_EVENTS_OPTIONAL,
    }[file_type]

    missing_opts = [col for col in opts if col not in df.columns]
    for col in missing_opts:
        msg = f"Optional column '{col}' is absent in file '{file_path}'"
        logger.warning(msg)
        warnings.warn(msg, UserWarning, stacklevel=2)


def load_snapshots(window: str) -> pd.DataFrame:
    """
    Load heat_pump_snapshots.csv, parse last_seen_at as datetime index.
    """
    if window not in WINDOW_DIRS:
        raise ValueError(f"Unknown window '{window}'. Expected one of: {list(WINDOW_DIRS.keys())}")
    path = PROJECT_ROOT / f"{WINDOW_DIRS[window]}/heat_pump_snapshots.csv"
    path_str = str(path)
    df = pd.read_csv(path)
    validate_columns(df, "snapshots", path_str)
    df["last_seen_at"] = pd.to_datetime(df["last_seen_at"])
    df.set_index("last_seen_at", inplace=True)
    return df


def load_intervals(window: str) -> pd.DataFrame:
    """
    Load heat_pump_intervals.csv, parse interval_start_time as datetime index.
    """
    if window not in WINDOW_DIRS:
        raise ValueError(f"Unknown window '{window}'. Expected one of: {list(WINDOW_DIRS.keys())}")
    path = PROJECT_ROOT / f"{WINDOW_DIRS[window]}/heat_pump_intervals.csv"
    path_str = str(path)
    df = pd.read_csv(path)
    validate_columns(df, "intervals", path_str)
    df["interval_start_time"] = pd.to_datetime(df["interval_start_time"])
    df.set_index("interval_start_time", inplace=True)
    return df


def load_power_draw(window: str) -> pd.DataFrame:
    """
    Load power_draw.csv, parse timestamp as datetime.
    """
    if window not in WINDOW_DIRS:
        raise ValueError(f"Unknown window '{window}'. Expected one of: {list(WINDOW_DIRS.keys())}")
    path = PROJECT_ROOT / f"{WINDOW_DIRS[window]}/power_draw.csv"
    path_str = str(path)
    df = pd.read_csv(path)
    validate_columns(df, "power_draw", path_str)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    return df


def load_space_events(window: str) -> pd.DataFrame:
    """
    Load space_events.csv, parse starts_at/ends_at as datetime.
    """
    if window not in WINDOW_DIRS:
        raise ValueError(f"Unknown window '{window}'. Expected one of: {list(WINDOW_DIRS.keys())}")
    path = PROJECT_ROOT / f"{WINDOW_DIRS[window]}/space_events.csv"
    path_str = str(path)
    df = pd.read_csv(path)
    validate_columns(df, "space_events", path_str)
    df["starts_at"] = pd.to_datetime(df["starts_at"])
    df["ends_at"] = pd.to_datetime(df["ends_at"])
    return df


def _interpolate_numeric_series(
    series: pd.Series,
) -> tuple[pd.Series, pd.Series, int, int]:
    """
    Interpolate a numeric series:
    - gaps <= 2 (30 min): forward fill
    - gaps > 2: flag as gap and do not interpolate
    Returns (interpolated_series, gap_flag_series, interpolated_count, gap_count).
    """
    series_copy = series.copy()
    gap_flag = pd.Series(0, index=series.index, dtype=int)
    interpolated_count = 0
    gap_count = 0

    is_nan = series_copy.isna()
    # Group contiguous NaNs using cumsum on boolean transitions
    nan_groups = is_nan.groupby((is_nan != is_nan.shift()).cumsum())

    for _, group in nan_groups:
        if group.iloc[0]:  # It is a group of NaNs
            gap_len = len(group)
            if gap_len <= MAX_INTERPOLATION_GAP:
                # Impute from last known value before this group
                last_known_idx = group.index[0] - pd.Timedelta(minutes=15)
                if last_known_idx in series_copy.index:
                    val = series_copy.loc[last_known_idx]
                    series_copy.loc[group.index] = val
                    interpolated_count += gap_len
            else:
                gap_count += 1
                gap_flag.loc[group.index] = 1

    return series_copy, gap_flag, interpolated_count, gap_count


def align_to_15min(df: pd.DataFrame, timestamp_col: str, agg: str = "mean") -> pd.DataFrame:
    """
    Resample the DataFrame to 15-minute intervals using the provided aggregation.
    Tracks and returns interpolation/fill metadata via the `.attrs` attribute.
    """
    df_copy = df.copy()
    if timestamp_col in df_copy.columns:
        df_copy[timestamp_col] = pd.to_datetime(df_copy[timestamp_col])
        df_copy.set_index(timestamp_col, inplace=True)
    else:
        df_copy.index = pd.to_datetime(df_copy.index)

    has_device = "device_id" in df_copy.columns

    # Find the overall min/max rounded to 15 minutes to align properly
    t_min = df_copy.index.min().floor("15min")
    t_max = df_copy.index.max().ceil("15min")
    grid = pd.date_range(start=t_min, end=t_max, freq="15min")

    numeric_cols = df_copy.select_dtypes(include="number").columns.tolist()
    if has_device and "device_id" in numeric_cols:
        numeric_cols.remove("device_id")

    non_numeric_cols = [c for c in df_copy.columns if c not in numeric_cols and c != "device_id"]

    metadata: dict[str, dict[str, int]] = {}
    for col in numeric_cols:
        metadata[col] = {
            "interpolated_count": 0,
            "gap_count": 0,
        }

    def process_subframe(sub_df: pd.DataFrame) -> pd.DataFrame:
        resampled_num = sub_df[numeric_cols].resample("15min").agg(agg).reindex(grid)
        resampled_cat = sub_df[non_numeric_cols].resample("15min").first().reindex(grid)

        for col in numeric_cols:
            series = resampled_num[col]
            new_series, gap_flag, interp_c, gap_c = _interpolate_numeric_series(series)
            resampled_num[col] = new_series
            metadata[col]["interpolated_count"] += interp_c
            metadata[col]["gap_count"] += gap_c
            if gap_c > 0:
                resampled_num[f"{col}_gap_flag"] = gap_flag

        return pd.concat([resampled_num, resampled_cat], axis=1)

    if has_device:
        aligned_parts = []
        devices = df_copy["device_id"].unique()
        for dev in devices:
            dev_df = df_copy[df_copy["device_id"] == dev]
            dev_aligned = process_subframe(dev_df)
            dev_aligned["device_id"] = dev
            aligned_parts.append(dev_aligned)
        aligned_df = pd.concat(aligned_parts)
    else:
        aligned_df = process_subframe(df_copy)

    aligned_df.index.name = "timestamp"
    aligned_df.attrs["interpolation_metadata"] = metadata
    return aligned_df


def build_aligned_dataset(window: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    """
    Load snapshots, intervals, power draw, and space events, align them to a
    15-minute grid, merge them, add occupancy flags, and engineer features.
    """
    df_snap = load_snapshots(window)
    df_int = load_intervals(window)
    df_pwr = load_power_draw(window)
    df_space = load_space_events(window)

    # 1. Align snapshots & power draw
    df_snap_aligned = align_to_15min(df_snap.reset_index(), timestamp_col="last_seen_at")
    df_pwr_aligned = align_to_15min(df_pwr, timestamp_col="timestamp")

    # 2. Merge aligned datasets
    df_snap_aligned_reset = df_snap_aligned.reset_index()
    df_pwr_aligned_reset = df_pwr_aligned.reset_index()
    merged = pd.merge(
        df_snap_aligned_reset,
        df_pwr_aligned_reset,
        on=["device_id", "timestamp"],
        how="outer",
    )

    # 3. Filter intervals to FIFTEEN_MINUTES and merge
    df_int_fifteen = df_int[df_int["time_range"] == "FIFTEEN_MINUTES"]
    df_int_reset = df_int_fifteen.reset_index().rename(columns={"interval_start_time": "timestamp"})
    # Exclude redundant/overlapping columns from intervals to avoid suffix duplicate issues
    # except device_id and timestamp
    cols_to_drop = [
        c
        for c in df_int_reset.columns
        if c in merged.columns and c not in ["device_id", "timestamp"]
    ]
    df_int_reset = df_int_reset.drop(columns=cols_to_drop)

    merged = pd.merge(merged, df_int_reset, on=["device_id", "timestamp"], how="left")
    merged.set_index("timestamp", inplace=True)

    # 4. Add occupancy flag from space events
    merged["occupancy_flag"] = 0
    for _, event in df_space.iterrows():
        mask = (merged.index < event["ends_at"]) & (
            merged.index + pd.Timedelta(minutes=15) > event["starts_at"]
        )
        merged.loc[mask, "occupancy_flag"] = 1

    # 5. Time features
    datetime_index = pd.DatetimeIndex(merged.index)
    merged["hour_of_day"] = datetime_index.hour
    merged["day_of_week"] = datetime_index.weekday
    merged["is_weekend"] = (merged["day_of_week"] >= WEEKEND_START_DAY).astype(int)

    # 6. Weather features
    if "status_temperature_outside_in_celsius" in merged.columns:
        merged["outside_temperature"] = merged["status_temperature_outside_in_celsius"]

    # 7. Envelope features
    if "status_is_heating_required" in merged.columns:
        merged["is_heating_required"] = (
            merged["status_is_heating_required"] > THRESHOLD_REQUIRED
        ).astype(int)
    if "status_is_cooling_required" in merged.columns:
        merged["is_cooling_required"] = (
            merged["status_is_cooling_required"] > THRESHOLD_REQUIRED
        ).astype(int)

    if "status_target_temperature_in_celsius" in merged.columns:
        merged["target_temp"] = merged["status_target_temperature_in_celsius"]
    elif "target_temperature_in_celsius" in merged.columns:
        merged["target_temp"] = merged["target_temperature_in_celsius"]

    if "target_temp" in merged.columns:
        if "status_temperature_in_celsius" in merged.columns:
            merged["temperature_delta"] = (
                merged["target_temp"] - merged["status_temperature_in_celsius"]
            )
        elif "median_temperature_in_celsius" in merged.columns:
            merged["temperature_delta"] = (
                merged["target_temp"] - merged["median_temperature_in_celsius"]
            )

    # Compile quality report
    snap_meta = df_snap_aligned.attrs.get("interpolation_metadata", {})
    pwr_meta = df_pwr_aligned.attrs.get("interpolation_metadata", {})

    quality_report: dict[str, Any] = {
        "window": window,
        "interpolation_counts": {},
        "longer_gaps": {},
    }
    for col, info in snap_meta.items():
        quality_report["interpolation_counts"][col] = info["interpolated_count"]
        quality_report["longer_gaps"][col] = info["gap_count"]
    for col, info in pwr_meta.items():
        quality_report["interpolation_counts"][col] = info["interpolated_count"]
        quality_report["longer_gaps"][col] = info["gap_count"]

    return merged, quality_report


def save_processed(
    df: pd.DataFrame, window: str, output_dir: str = "backend/data/processed"
) -> pathlib.Path:
    """
    Save the aligned DataFrame as a CSV file in output_dir.
    """
    out_path = pathlib.Path(output_dir)
    if not out_path.is_absolute():
        out_path = PROJECT_ROOT / out_path
    out_path.mkdir(parents=True, exist_ok=True)
    file_path = out_path / f"{window}_processed.csv"
    # Ensure index is saved as a column
    df.reset_index().to_csv(file_path, index=False)
    return file_path


def load_processed(window: str, output_dir: str = "backend/data/processed") -> pd.DataFrame:
    """
    Load a cached processed CSV file and set timestamp as datetime index.
    """
    out_path = pathlib.Path(output_dir)
    if not out_path.is_absolute():
        out_path = PROJECT_ROOT / out_path
    file_path = out_path / f"{window}_processed.csv"
    if not file_path.exists():
        raise FileNotFoundError(f"Processed file not found: {file_path}")
    df = pd.read_csv(file_path)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df.set_index("timestamp", inplace=True)
    return df


def build_room_physical_model_frame(
    df: pd.DataFrame,
    *,
    dt_seconds: float = 900.0,
    cop: float = 1.0,
) -> pd.DataFrame:
    """
    Aggregate per-device processed rows into one room-level physical-model frame.

    The thermal state is room-level, while processed rows are per device. This helper
    keeps observed temperature and outdoor telemetry as device means, sums electrical
    power across all devices, and derives interval/cumulative electricity use.
    """
    if dt_seconds <= 0.0:
        raise ValueError("dt_seconds must be positive.")
    if cop <= 0.0:
        raise ValueError("cop must be positive.")

    required_cols = [
        "device_id",
        "status_temperature_in_celsius",
        "outside_temperature",
        "power_draw_kw",
    ]
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"Processed physical model data is missing columns: {missing_cols}")
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError("Processed physical model data must be indexed by timestamp.")

    grouped = df.sort_index().groupby(level=0, sort=True)
    room_df = pd.DataFrame(index=grouped.size().index)
    room_df.index.name = df.index.name or "timestamp"

    room_df["T_in"] = grouped["status_temperature_in_celsius"].mean()
    room_df["T_out"] = grouped["outside_temperature"].mean()
    room_df["Q_electric_kw"] = grouped["power_draw_kw"].sum()
    room_df["device_count"] = grouped["device_id"].nunique()

    optional_aggregations = {
        "target_temp": "mean",
        "occupancy_flag": "max",
        "is_heating_required": "max",
        "is_cooling_required": "max",
        "status_is_compressor_active": "max",
        "status_is_defrost_active": "max",
        "hour_of_day": "first",
        "day_of_week": "first",
        "is_weekend": "first",
    }
    for col, agg in optional_aggregations.items():
        if col in df.columns:
            if agg == "mean":
                room_df[col] = grouped[col].mean()
            elif agg == "max":
                room_df[col] = grouped[col].max()
            else:
                room_df[col] = grouped[col].first()

    dt_hours = dt_seconds / SECONDS_PER_HOUR
    room_df["Q_heat_kw"] = room_df["Q_electric_kw"] * cop
    room_df["electricity_kwh"] = room_df["Q_electric_kw"] * dt_hours
    room_df["cumulative_electricity_kwh"] = room_df["electricity_kwh"].cumsum()

    return room_df.dropna(subset=["T_in", "T_out", "Q_electric_kw", "Q_heat_kw"])


KNOWN_DEVICE_ORDER = [
    "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",
    "1c893f75-4599-4402-9d4c-1017aa858fa8",
    "e72fea56-abe7-4d3f-a0ed-1e6b6c462157",
    "930f3621-05df-4574-9270-9d994c5b716c",
]


FIFTEEN_MINUTE_HOURS = 0.25
EVENT_FEATURE_INTERVAL = pd.Timedelta(minutes=15)


def _require_datetime_index(df: pd.DataFrame, frame_name: str) -> None:
    if not isinstance(df.index, pd.DatetimeIndex):
        raise ValueError(f"{frame_name} must be indexed by timestamp.")


def _require_columns(df: pd.DataFrame, required_cols: list[str], frame_name: str) -> None:
    missing_cols = [col for col in required_cols if col not in df.columns]
    if missing_cols:
        raise ValueError(f"{frame_name} is missing columns: {missing_cols}")


def _ordered_device_ids(df: pd.DataFrame, expected_devices: int) -> list[str]:
    observed = [str(device_id) for device_id in pd.Series(df["device_id"]).dropna().unique()]
    known_observed = [device_id for device_id in KNOWN_DEVICE_ORDER if device_id in observed]
    unknown_observed = sorted(
        device_id for device_id in observed if device_id not in KNOWN_DEVICE_ORDER
    )
    ordered = known_observed + unknown_observed
    if len(ordered) < expected_devices:
        ordered.extend(
            device_id for device_id in KNOWN_DEVICE_ORDER if device_id not in ordered
        )
    return ordered[:expected_devices]


def build_device_level_features(
    df: pd.DataFrame,
    standby_baseline: float,
    *,
    expected_devices: int = 4,
) -> pd.DataFrame:
    """
    Pivot long-format device data into deterministic wide-format features.

    Creates `device_i_power_kw` and `device_i_active` columns for i=1..4 by
    default. Device activity means `was_adjusting_temperature == 1` or observed
    power draw above the supplied standby baseline. Duplicate device/timestamp
    rows are collapsed with mean power and max adjustment flag before pivoting.
    """
    if standby_baseline < 0.0:
        raise ValueError("standby_baseline must be non-negative.")
    if expected_devices <= 0:
        raise ValueError("expected_devices must be positive.")
    _require_datetime_index(df, "Device-level feature data")
    _require_columns(
        df,
        ["device_id", "power_draw_kw", "was_adjusting_temperature"],
        "Device-level feature data",
    )

    unique_timestamps = pd.DatetimeIndex(sorted(df.index.unique()), name="timestamp")
    wide_df = pd.DataFrame(index=unique_timestamps)

    device_ids = _ordered_device_ids(df, expected_devices)
    for dev_num, dev_id in enumerate(device_ids, start=1):
        dev_df = df[df["device_id"].astype(str) == dev_id]
        if dev_df.empty:
            power = pd.Series(float("nan"), index=unique_timestamps, dtype="float64")
            active = pd.Series(0.0, index=unique_timestamps, dtype="float64")
        else:
            collapsed = dev_df.groupby(level=0, sort=True).agg(
                power_draw_kw=("power_draw_kw", "mean"),
                was_adjusting_temperature=("was_adjusting_temperature", "max"),
            )
            collapsed = collapsed.reindex(unique_timestamps)
            power = pd.to_numeric(collapsed["power_draw_kw"], errors="coerce")
            was_adjusting = pd.to_numeric(
                collapsed["was_adjusting_temperature"], errors="coerce"
            ).fillna(0.0)
            active = ((was_adjusting == 1.0) | (power > standby_baseline)).astype(float)

        wide_df[f"device_{dev_num}_power_kw"] = power
        wide_df[f"device_{dev_num}_active"] = active

    return wide_df


def build_room_level_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build room-level features by aggregating per-device processed rows.

    Temperature, return temperature, humidity, and CO2 use a timestamp median;
    power uses a timestamp sum; energy assumes the 15-minute grid established by
    the preprocessing pipeline.
    """
    _require_datetime_index(df, "Room-level feature data")
    _require_columns(
        df,
        [
            "status_temperature_in_celsius",
            "status_temperature_return_in_celsius",
            "status_humidity_in_percent",
            "status_carbon_dioxide_in_ppm",
            "power_draw_kw",
        ],
        "Room-level feature data",
    )

    grouped = df.sort_index().groupby(level=0, sort=True)

    timestamps = pd.DatetimeIndex(sorted(df.index.unique()), name="timestamp")
    room_df = pd.DataFrame(index=timestamps)

    room_df["room_temp"] = grouped["status_temperature_in_celsius"].median()
    room_df["room_return_temp"] = grouped["status_temperature_return_in_celsius"].median()
    room_df["room_humidity"] = grouped["status_humidity_in_percent"].median()
    room_df["room_co2"] = grouped["status_carbon_dioxide_in_ppm"].median()

    room_df["room_power_kw"] = grouped["power_draw_kw"].sum()
    room_df["room_energy_kwh"] = room_df["room_power_kw"] * FIFTEEN_MINUTE_HOURS

    if "outside_temperature" in df.columns:
        room_df["outside_temperature"] = grouped["outside_temperature"].first()
    elif "status_temperature_outside_in_celsius" in df.columns:
        room_df["outside_temperature"] = grouped[
            "status_temperature_outside_in_celsius"
        ].first()

    for col in ["hour_of_day", "day_of_week", "is_weekend", "occupancy_flag"]:
        if col in df.columns:
            room_df[col] = grouped[col].first()

    return room_df


def build_event_features(
    df_index: pd.DatetimeIndex,
    df_space: pd.DataFrame,
    preconditioning_window_hours: float = 2.0,
) -> pd.DataFrame:
    """
    Build event-based features from space_events.csv for a 15-minute grid.
    """
    if not isinstance(df_index, pd.DatetimeIndex):
        raise ValueError("df_index must be a DatetimeIndex.")
    if preconditioning_window_hours < 0.0:
        raise ValueError("preconditioning_window_hours must be non-negative.")
    _require_columns(df_space, ["starts_at", "ends_at"], "Space event data")

    events = df_space.copy()
    events["starts_at"] = pd.to_datetime(events["starts_at"])
    events["ends_at"] = pd.to_datetime(events["ends_at"])
    malformed = events["ends_at"] < events["starts_at"]
    if malformed.any():
        raise ValueError("Space event data contains events ending before they start.")
    events = events.sort_values("starts_at").reset_index(drop=True)

    event_active = []
    minutes_to_next_event = []
    minutes_since_previous_event = []
    next_event_start = []
    next_event_end = []

    for t in df_index:
        t_end = t + EVENT_FEATURE_INTERVAL
        active_events = events[(t < events["ends_at"]) & (t_end > events["starts_at"])]
        event_active.append(0 if active_events.empty else 1)

        future_events = events[events["starts_at"] > t]
        if future_events.empty:
            minutes_to_next_event.append(float("nan"))
            next_event_start.append(pd.NaT)
            next_event_end.append(pd.NaT)
        else:
            next_ev = future_events.iloc[0]
            minutes_to_next_event.append((next_ev["starts_at"] - t).total_seconds() / 60.0)
            next_event_start.append(next_ev["starts_at"])
            next_event_end.append(next_ev["ends_at"])

        past_events = events[events["ends_at"] <= t]
        if past_events.empty:
            minutes_since_previous_event.append(float("nan"))
        else:
            prev_ev = past_events.iloc[-1]
            minutes_since_previous_event.append((t - prev_ev["ends_at"]).total_seconds() / 60.0)

    feat_df = pd.DataFrame(index=df_index)
    feat_df.index.name = df_index.name or "timestamp"
    feat_df["event_active"] = event_active
    feat_df["minutes_to_next_event"] = minutes_to_next_event
    feat_df["minutes_since_previous_event"] = minutes_since_previous_event
    feat_df["next_event_start"] = next_event_start
    feat_df["next_event_end"] = next_event_end

    precond_min = preconditioning_window_hours * 60.0
    feat_df["inside_preconditioning_window"] = (
        (feat_df["minutes_to_next_event"] > 0)
        & (feat_df["minutes_to_next_event"] <= precond_min)
        & (feat_df["event_active"] == 0)
    ).astype(float)

    return feat_df


def check_coefficient_plausibility(
    a: float, b: float, c_heat: float, c_cool: float, threshold: float = 1e-2
) -> bool:
    """
    Check if the physical coefficients of the thermal model are plausible.
    a > 0: indoor temperature has positive autocorrelation.
    b >= -threshold: outside temperature effect is positive or near zero.
    c_heat >= -threshold: heating power increases or doesn't change temperature.
    c_cool >= -threshold: cooling power decreases or doesn't change temperature.
    """
    if a <= 0:
        return False
    if b < -threshold:
        return False
    if c_heat < -threshold:
        return False
    if c_cool < -threshold:
        return False
    return True


def train_thermal_model(
    df: pd.DataFrame,
    season: str,
    split_timestamp: pd.Timestamp,
    alpha: float = 1.0,
) -> dict[str, Any]:
    """
    Train a grey-box thermal model using Ridge regression.
    Equation: T_next = a*T_room + b*T_outside + c_heat*total_heating_power - c_cool*total_cooling_power + d*event_active
    """
    if season not in ["heating", "cooling"]:
        raise ValueError("season must be 'heating' or 'cooling'")

    df_copy = df.copy()
    df_copy["T_next"] = df_copy["room_temp"].shift(-1)

    feature_cols = ["room_temp", "outside_temperature", "room_power_kw", "event_active"]
    df_copy = df_copy.dropna(subset=["T_next"] + feature_cols)

    train_df = df_copy[df_copy.index < split_timestamp]
    if train_df.empty:
        raise ValueError(f"Training data is empty before {split_timestamp}")

    X_train = train_df[feature_cols]
    y_train = train_df["T_next"]

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)

    model = Ridge(alpha=alpha, fit_intercept=True)
    model.fit(X_train_scaled, y_train)

    w = model.coef_
    a = w[0] / scaler.scale_[0]
    b = w[1] / scaler.scale_[1]
    c_power = w[2] / scaler.scale_[2]
    d = w[3] / scaler.scale_[3]

    if season == "heating":
        c_heat = c_power
        c_cool = 0.0
    else:
        c_heat = 0.0
        c_cool = -c_power

    is_plausible = check_coefficient_plausibility(a, b, c_heat, c_cool)

    if not is_plausible:
        fallback_reason = f"Implausible coefficients: a={a:.6f}, b={b:.6f}, c_heat={c_heat:.6f}, c_cool={c_cool:.6f}"
        logger.warning(f"Activating room-level fallback for season {season}: {fallback_reason}")

        fb_features = ["room_temp"]
        X_train_fb = train_df[fb_features]
        scaler_fb = StandardScaler()
        X_train_fb_scaled = scaler_fb.fit_transform(X_train_fb)

        model_fb = Ridge(alpha=alpha, fit_intercept=True)
        model_fb.fit(X_train_fb_scaled, y_train)

        w_fb = model_fb.coef_
        a_fb = w_fb[0] / scaler_fb.scale_[0]
        intercept_fb = model_fb.intercept_ - (w_fb[0] * scaler_fb.mean_[0] / scaler_fb.scale_[0])

        return {
            "model": model_fb,
            "scaler": scaler_fb,
            "season": season,
            "is_fallback": True,
            "fallback_reason": fallback_reason,
            "a": a_fb,
            "b": 0.0,
            "c_heat": 0.0,
            "c_cool": 0.0,
            "d": 0.0,
            "intercept": intercept_fb,
            "features": fb_features,
        }

    intercept = model.intercept_ - (
        w[0] * scaler.mean_[0] / scaler.scale_[0] +
        w[1] * scaler.mean_[1] / scaler.scale_[1] +
        w[2] * scaler.mean_[2] / scaler.scale_[2] +
        w[3] * scaler.mean_[3] / scaler.scale_[3]
    )

    return {
        "model": model,
        "scaler": scaler,
        "season": season,
        "is_fallback": False,
        "fallback_reason": None,
        "a": a,
        "b": b,
        "c_heat": c_heat,
        "c_cool": c_cool,
        "d": d,
        "intercept": intercept,
        "features": feature_cols,
    }


def predict_temperature(model_dict: dict[str, Any], df: pd.DataFrame) -> pd.Series:
    """
    Predict next step's room temperature using the trained model dict.
    """
    features = model_dict["features"]
    missing = [col for col in features if col not in df.columns]
    if missing:
        raise ValueError(f"Required features {missing} not found in input DataFrame.")

    X = df[features]
    non_nan_mask = X.notna().all(axis=1)

    preds = pd.Series(float("nan"), index=df.index, dtype="float64")
    if non_nan_mask.any():
        X_valid = X[non_nan_mask]
        X_scaled = model_dict["scaler"].transform(X_valid)
        preds.loc[non_nan_mask] = model_dict["model"].predict(X_scaled)
    return preds


def train_device_power_model(
    df: pd.DataFrame,
    season: str,
    split_timestamp: pd.Timestamp,
    expected_devices: int = 4,
) -> dict[str, Any]:
    """
    Train a per-device power model: for each device, learn typical active vs standby power.
    """
    train_df = df[df.index < split_timestamp]
    device_params = {}
    for i in range(1, expected_devices + 1):
        power_col = f"device_{i}_power_kw"
        active_col = f"device_{i}_active"
        if power_col not in df.columns or active_col not in df.columns:
            device_params[f"device_{i}"] = {
                "active_power": 0.0,
                "standby_power": 0.0,
            }
            continue
        active_vals = train_df.loc[train_df[active_col] == 1.0, power_col].dropna()
        standby_vals = train_df.loc[train_df[active_col] == 0.0, power_col].dropna()

        active_power = active_vals.mean() if not active_vals.empty else 0.0
        standby_power = standby_vals.mean() if not standby_vals.empty else 0.0

        device_params[f"device_{i}"] = {
            "active_power": float(active_power),
            "standby_power": float(standby_power),
        }
    return {
        "season": season,
        "device_params": device_params,
        "expected_devices": expected_devices,
    }


def predict_device_power(
    model_dict: dict[str, Any],
    df: pd.DataFrame,
) -> pd.DataFrame:
    """
    Predict device power from control decisions (device on/off) without using measured power.
    """
    expected_devices = model_dict.get("expected_devices", 4)
    device_params = model_dict["device_params"]
    preds_df = pd.DataFrame(index=df.index)
    for i in range(1, expected_devices + 1):
        active_col = f"device_{i}_active"
        if active_col in df.columns:
            active_decisions = df[active_col].fillna(0.0)
        else:
            active_decisions = pd.Series(0.0, index=df.index)
        p_active = device_params[f"device_{i}"]["active_power"]
        p_standby = device_params[f"device_{i}"]["standby_power"]
        preds_df[f"device_{i}_predicted_power_kw"] = active_decisions * p_active + (1.0 - active_decisions) * p_standby
    return preds_df


def save_model_artifacts(
    artifacts_dir: str | pathlib.Path,
    thermal_model_dict: dict[str, Any],
    device_power_model_dict: dict[str, Any],
    metrics: dict[str, Any] | None = None,
    train_timestamps: dict[str, Any] | None = None,
) -> None:
    """
    Save trained model artifacts:
    - thermal_model.joblib
    - scaler.joblib
    - feature_columns.json
    - model_metadata.json
    - device_power_model.joblib

    To support both seasons, we save both season-prefixed files and the standard files.
    """
    dir_path = pathlib.Path(artifacts_dir)
    dir_path.mkdir(parents=True, exist_ok=True)

    season = thermal_model_dict.get("season", "heating")

    # Construct metadata
    metadata = {
        "season": season,
        "train_timestamps": train_timestamps or {},
        "coefficients": {
            "a": thermal_model_dict.get("a"),
            "b": thermal_model_dict.get("b"),
            "c_heat": thermal_model_dict.get("c_heat"),
            "c_cool": thermal_model_dict.get("c_cool"),
            "d": thermal_model_dict.get("d"),
            "intercept": thermal_model_dict.get("intercept"),
        },
        "is_fallback": thermal_model_dict.get("is_fallback", False),
        "fallback_reason": thermal_model_dict.get("fallback_reason"),
        "metrics": metrics or {},
        "features": thermal_model_dict.get("features", []),
        "device_power_model_params": device_power_model_dict.get("device_params", {}),
    }

    # Files to write
    files_to_write = [
        # standard filenames
        ("thermal_model.joblib", thermal_model_dict["model"], "joblib"),
        ("scaler.joblib", thermal_model_dict["scaler"], "joblib"),
        ("feature_columns.json", thermal_model_dict["features"], "json"),
        ("model_metadata.json", metadata, "json"),
        ("device_power_model.joblib", device_power_model_dict, "joblib"),
        # season-prefixed filenames for notebooks/multi-season safety
        (f"{season}_thermal_model.joblib", thermal_model_dict["model"], "joblib"),
        (f"{season}_scaler.joblib", thermal_model_dict["scaler"], "joblib"),
        (f"{season}_feature_columns.json", thermal_model_dict["features"], "json"),
        (f"{season}_model_metadata.json", metadata, "json"),
        (f"{season}_device_power_model.joblib", device_power_model_dict, "joblib"),
    ]

    for filename, obj, format_type in files_to_write:
        file_path = dir_path / filename
        if format_type == "joblib":
            joblib.dump(obj, file_path)
        elif format_type == "json":
            with open(file_path, "w") as f:
                json.dump(obj, f, indent=2)


def load_model_artifacts(
    artifacts_dir: str | pathlib.Path,
    season: str | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """
    Load saved model artifacts and reconstruct model dictionaries:
    - thermal_model_dict
    - device_power_model_dict
    """
    dir_path = pathlib.Path(artifacts_dir)

    # Decide prefix
    prefix = f"{season}_" if season else ""

    # Check if files exist. Fall back to unprefixed if prefixed don't exist.
    thermal_model_path = dir_path / f"{prefix}thermal_model.joblib"
    if season and not thermal_model_path.exists():
        # Fallback to unprefixed
        thermal_model_path = dir_path / "thermal_model.joblib"
        scaler_path = dir_path / "scaler.joblib"
        metadata_path = dir_path / "model_metadata.json"
        power_model_path = dir_path / "device_power_model.joblib"
    else:
        scaler_path = dir_path / f"{prefix}scaler.joblib"
        metadata_path = dir_path / f"{prefix}model_metadata.json"
        power_model_path = dir_path / f"{prefix}device_power_model.joblib"

    if not thermal_model_path.exists():
        raise FileNotFoundError(f"Thermal model file not found: {thermal_model_path}")
    if not scaler_path.exists():
        raise FileNotFoundError(f"Scaler file not found: {scaler_path}")
    if not metadata_path.exists():
        raise FileNotFoundError(f"Model metadata file not found: {metadata_path}")
    if not power_model_path.exists():
        raise FileNotFoundError(f"Device power model file not found: {power_model_path}")

    # Load objects
    model = joblib.load(thermal_model_path)
    scaler = joblib.load(scaler_path)
    with open(metadata_path, "r") as f:
        metadata = json.load(f)
    device_power_model_dict = joblib.load(power_model_path)

    # Reconstruct thermal_model_dict
    coefs = metadata.get("coefficients", {})
    thermal_model_dict = {
        "model": model,
        "scaler": scaler,
        "season": metadata.get("season", season),
        "is_fallback": metadata.get("is_fallback", False),
        "fallback_reason": metadata.get("fallback_reason"),
        "a": coefs.get("a"),
        "b": coefs.get("b"),
        "c_heat": coefs.get("c_heat"),
        "c_cool": coefs.get("c_cool"),
        "d": coefs.get("d"),
        "intercept": coefs.get("intercept"),
        "features": metadata.get("features", ["room_temp", "outside_temperature", "room_power_kw", "event_active"] if not metadata.get("is_fallback") else ["room_temp"]),
    }

    # If features not directly in metadata top-level, check if we saved feature_columns.json
    feature_cols_path = dir_path / f"{prefix}feature_columns.json"
    if not feature_cols_path.exists() and season:
        feature_cols_path = dir_path / "feature_columns.json"
    if feature_cols_path.exists():
        with open(feature_cols_path, "r") as f:
            thermal_model_dict["features"] = json.load(f)

    return thermal_model_dict, device_power_model_dict


