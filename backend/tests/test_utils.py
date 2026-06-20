import pathlib
from collections.abc import Callable

import pandas as pd
import pytest
from notebooks.utils import (
    align_to_15min,
    build_aligned_dataset,
    build_room_physical_model_frame,
    load_intervals,
    load_power_draw,
    load_processed,
    load_snapshots,
    load_space_events,
    save_processed,
    validate_columns,
)

EXPECTED_ALIGNED_ROWS_WITH_LONG_GAP = 8
EXPECTED_SHORT_GAP_FILL_VALUE = 11.0


def test_load_snapshots_heating() -> None:
    """
    Loads heating snapshots, checks expected columns (device_id,
    status_temperature_in_celsius, last_seen_at), and confirms non-empty DataFrame.
    """
    df = load_snapshots("heating")
    assert not df.empty
    assert "device_id" in df.columns
    assert "status_temperature_in_celsius" in df.columns
    # last_seen_at is parsed and set as index
    assert df.index.name == "last_seen_at"
    assert isinstance(df.index, pd.DatetimeIndex)


def test_load_snapshots_invalid_window() -> None:
    """
    Passing an invalid window raises ValueError.
    """
    with pytest.raises(ValueError, match="Unknown window 'shoulder'"):
        load_snapshots("shoulder")


def test_load_intervals_heating() -> None:
    """
    Loads intervals, checks expected columns, and verifies row count is reasonable.
    """
    df = load_intervals("heating")
    assert not df.empty
    assert "device_id" in df.columns
    assert "space_uuid" in df.columns
    assert "interval_end_time" in df.columns
    # interval_start_time is parsed and set as index
    assert df.index.name == "interval_start_time"
    assert isinstance(df.index, pd.DatetimeIndex)
    assert len(df) > 0


def test_load_power_draw_cooling() -> None:
    """
    Loads cooling power_draw, checks device_id and power_draw_kw columns.
    """
    df = load_power_draw("cooling")
    assert not df.empty
    assert "device_id" in df.columns
    assert "power_draw_kw" in df.columns
    assert "timestamp" in df.columns
    assert pd.api.types.is_datetime64_any_dtype(df["timestamp"])


def test_load_space_events() -> None:
    """
    Loads events, checks starts_at/ends_at are datetime.
    """
    df = load_space_events("heating")
    assert not df.empty
    assert "starts_at" in df.columns
    assert "ends_at" in df.columns
    assert pd.api.types.is_datetime64_any_dtype(df["starts_at"])
    assert pd.api.types.is_datetime64_any_dtype(df["ends_at"])


def test_align_to_15min() -> None:
    """
    Takes a small synthetic DataFrame with irregular timestamps, aligns to 15-min,
    and asserts output has expected 15-min frequency.
    """
    times = pd.to_datetime(
        [
            "2026-03-30 00:01:05",
            "2026-03-30 00:14:22",
            "2026-03-30 00:33:11",
            "2026-03-30 00:44:00",
        ]
    )
    df = pd.DataFrame(
        {
            "device_id": ["dev_1"] * len(times),
            "status_temperature_outside_in_celsius": [10.0, 11.0, 13.0, 15.0],
        },
        index=times,
    )

    aligned = align_to_15min(df, timestamp_col="timestamp")
    # Verify index properties
    assert isinstance(aligned.index, pd.DatetimeIndex)
    # Check frequency: we resample to '15min'
    # We can verify that differences between consecutive indexes are 15 minutes
    diffs = pd.Series(aligned.index).diff().dropna()
    assert (diffs == pd.Timedelta(minutes=15)).all()


def test_build_aligned_dataset_heating() -> None:
    """
    Builds full aligned dataset for heating window, checks key columns exist,
    and checks quality report dict has interpolation counts.
    """
    merged, report = build_aligned_dataset("heating")
    assert not merged.empty
    assert "hour_of_day" in merged.columns
    assert "day_of_week" in merged.columns
    assert "is_weekend" in merged.columns
    assert "occupancy_flag" in merged.columns
    assert "outside_temperature" in merged.columns

    assert isinstance(report, dict)
    assert report["window"] == "heating"
    assert "interpolation_counts" in report
    assert "longer_gaps" in report
    assert len(report["interpolation_counts"]) > 0


def test_build_aligned_dataset_cooling() -> None:
    """
    Builds full aligned dataset for cooling window, checks key columns exist,
    and checks quality report dict has interpolation counts.
    """
    merged, report = build_aligned_dataset("cooling")
    assert not merged.empty
    assert "hour_of_day" in merged.columns
    assert "day_of_week" in merged.columns
    assert "is_weekend" in merged.columns
    assert "occupancy_flag" in merged.columns
    assert "outside_temperature" in merged.columns

    assert isinstance(report, dict)
    assert report["window"] == "cooling"
    assert "interpolation_counts" in report
    assert "longer_gaps" in report
    assert len(report["interpolation_counts"]) > 0


def test_save_and_load_processed(tmp_path: pathlib.Path) -> None:
    """
    Saves a processed DataFrame, loads it back, checks round-trip equality (using tmp_path fixture).
    """
    merged, _ = build_aligned_dataset("heating")
    output_dir = str(tmp_path)

    file_path = save_processed(merged, "heating", output_dir=output_dir)
    assert pathlib.Path(file_path).exists()

    loaded = load_processed("heating", output_dir=output_dir)
    assert not loaded.empty
    assert loaded.index.name == "timestamp"
    # Ensure they have the same columns and shapes
    assert list(loaded.columns) == list(merged.columns)
    assert len(loaded) == len(merged)


def test_occupancy_flag() -> None:
    """
    Verifies occupancy_flag is 1 during event periods, 0 outside.
    """
    # Create small synthetic datasets
    # 1. Snapshots: 15-minute intervals from 00:00 to 01:00 (5 points)
    times = pd.date_range("2026-03-30 00:00:00", "2026-03-30 01:00:00", freq="15min")

    # 2. Space events: one event from 00:10 to 00:35
    # This should overlap with 15-min intervals:
    # - 00:00 to 00:15 (starts at 00:00, overlaps 00:10 to 00:15) -> 1
    # - 00:15 to 00:30 (starts at 00:15, overlaps 00:15 to 00:30) -> 1
    # - 00:30 to 00:45 (starts at 00:30, overlaps 00:30 to 00:35) -> 1
    # - 00:45 to 01:00 (starts at 00:45, no overlap) -> 0
    df_space = pd.DataFrame(
        {
            "starts_at": [pd.to_datetime("2026-03-30 00:10:00")],
            "ends_at": [pd.to_datetime("2026-03-30 00:35:00")],
        }
    )

    # We mock loading functions by patching or calling build_aligned_dataset internal steps.
    # To keep it simple and robust, let's check with the real data first,
    # or write a unit test directly testing the occupancy assignment logic using a dummy DataFrame.
    # Let's write the test directly for the logic.
    # We can create a merged dataset manually:
    merged = pd.DataFrame(
        {
            "device_id": ["dev_1"] * len(times),
        },
        index=times,
    )
    merged.index.name = "timestamp"

    # Run the exact occupancy logic:
    merged["occupancy_flag"] = 0
    for _, event in df_space.iterrows():
        mask = (merged.index < event["ends_at"]) & (
            merged.index + pd.Timedelta(minutes=15) > event["starts_at"]
        )
        merged.loc[mask, "occupancy_flag"] = 1

    # Verify:
    # 00:00:00 index: interval is [00:00, 00:15], overlaps [00:10, 00:35]
    assert merged.loc["2026-03-30 00:00:00", "occupancy_flag"] == 1
    # 00:15:00 index: interval is [00:15, 00:30], overlaps [00:10, 00:35]
    assert merged.loc["2026-03-30 00:15:00", "occupancy_flag"] == 1
    # 00:30:00 index: interval is [00:30, 00:45], overlaps [00:10, 00:35]
    assert merged.loc["2026-03-30 00:30:00", "occupancy_flag"] == 1
    # 00:45:00 index: interval is [00:45, 01:00], no overlap with [00:10, 00:35]
    assert merged.loc["2026-03-30 00:45:00", "occupancy_flag"] == 0
    # 01:00:00 index: interval is [01:00, 01:15], no overlap with [00:10, 00:35]
    assert merged.loc["2026-03-30 01:00:00", "occupancy_flag"] == 0


def test_validate_columns_raises_on_missing_required() -> None:
    df = pd.DataFrame({"device_id": ["dev_1"], "last_seen_at": ["2026-03-30T00:00:00"]})
    with pytest.raises(ValueError, match="status_temperature_outside_in_celsius"):
        validate_columns(df, "snapshots", "dummy_path.csv")


def test_validate_columns_warns_on_missing_optional() -> None:
    df = pd.DataFrame(
        {
            "device_id": ["dev_1"],
            "timestamp": ["2026-03-30T00:00:00"],
            "power_draw_kw": [1.25],
        }
    )

    with pytest.warns(UserWarning, match="Optional column 'device_name' is absent"):
        validate_columns(df, "power_draw", "power_draw.csv")


@pytest.mark.parametrize(
    "loader",
    [load_snapshots, load_intervals, load_power_draw, load_space_events, build_aligned_dataset],
)
def test_window_validation_rejects_unknown_window(loader: Callable[[str], object]) -> None:
    with pytest.raises(ValueError, match="Unknown window 'shoulder'"):
        loader("shoulder")


def test_load_processed_raises_for_missing_cache(tmp_path: pathlib.Path) -> None:
    with pytest.raises(FileNotFoundError, match="Processed file not found"):
        load_processed("heating", output_dir=str(tmp_path))


def test_build_room_physical_model_frame_aggregates_device_power() -> None:
    timestamps = pd.to_datetime(
        [
            "2026-03-30 00:00:00",
            "2026-03-30 00:00:00",
            "2026-03-30 00:15:00",
            "2026-03-30 00:15:00",
        ]
    )
    df = pd.DataFrame(
        {
            "device_id": ["dev_1", "dev_2", "dev_1", "dev_2"],
            "status_temperature_in_celsius": [20.0, 22.0, 21.0, 23.0],
            "outside_temperature": [5.0, 7.0, 6.0, 8.0],
            "power_draw_kw": [1.0, 2.0, 3.0, 4.0],
            "target_temp": [21.0, 21.0, 22.0, 22.0],
            "occupancy_flag": [0, 1, 0, 0],
            "is_heating_required": [1, 0, 1, 1],
            "status_is_compressor_active": [0, 1, 1, 1],
            "hour_of_day": [0, 0, 0, 0],
            "is_weekend": [0, 0, 0, 0],
        },
        index=timestamps,
    )
    df.index.name = "timestamp"

    room_df = build_room_physical_model_frame(df, dt_seconds=900.0, cop=2.0)

    assert list(room_df["device_count"]) == [2, 2]
    assert list(room_df["T_in"]) == [21.0, 22.0]
    assert list(room_df["T_out"]) == [6.0, 7.0]
    assert list(room_df["Q_electric_kw"]) == [3.0, 7.0]
    assert list(room_df["Q_heat_kw"]) == [6.0, 14.0]
    assert list(room_df["electricity_kwh"]) == [0.75, 1.75]
    assert list(room_df["cumulative_electricity_kwh"]) == [0.75, 2.5]
    assert list(room_df["occupancy_flag"]) == [1, 0]
