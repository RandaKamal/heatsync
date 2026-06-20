import pytest
import pandas as pd
import pathlib
from notebooks.utils import (
    align_to_15min,
    build_aligned_dataset,
    load_snapshots,
    load_intervals,
    load_power_draw,
    load_space_events,
    save_processed,
    load_processed,
    validate_columns,
)

def test_load_functions_work_correctly() -> None:
    # Test snapshots
    df_snap = load_snapshots("heating")
    assert not df_snap.empty
    assert isinstance(df_snap.index, pd.DatetimeIndex)
    assert "device_id" in df_snap.columns

    # Test intervals
    df_int = load_intervals("heating")
    assert not df_int.empty
    assert isinstance(df_int.index, pd.DatetimeIndex)

    # Test power draw
    df_pwr = load_power_draw("heating")
    assert not df_pwr.empty
    assert "timestamp" in df_pwr.columns

    # Test space events
    df_space = load_space_events("heating")
    assert not df_space.empty
    assert "starts_at" in df_space.columns


def test_validate_columns_raises_on_missing_required() -> None:
    df = pd.DataFrame({"some_other_col": [1, 2]})
    with pytest.raises(ValueError, match="missing required columns"):
        validate_columns(df, "snapshots", "dummy_path.csv")


def test_align_to_15min_resampling_and_imputation() -> None:
    # Create simple dataframe with 15min intervals and a gap
    times = pd.to_datetime([
        "2026-03-30 00:00:00",
        "2026-03-30 00:15:00",
        # 00:30 is missing (gap of 1 interval <= 2)
        "2026-03-30 00:45:00",
        # 01:00, 01:15, 01:30 are missing (gap of 3 intervals > 2)
        "2026-03-30 01:45:00",
    ])
    df = pd.DataFrame({
        "device_id": ["dev_1"] * len(times),
        "val": [10.0, 11.0, 13.0, 15.0],
    }, index=times)

    aligned = align_to_15min(df, timestamp_col="timestamp")
    
    # Check that grid spans from 00:00:00 to 01:45:00 with 15min frequency (8 intervals)
    assert len(aligned) == 8
    # Short gap of 1 interval should be filled with last known value (11.0)
    assert aligned.loc["2026-03-30 00:30:00", "val"] == 11.0
    
    # Check interpolation metadata
    meta = aligned.attrs["interpolation_metadata"]
    assert meta["val"]["interpolated_count"] == 1
    assert meta["val"]["gap_count"] == 1  # 1 group flagged as long gap
    
    # Gap of > 2 intervals should be flagged as gap and NOT interpolated (NaN)
    assert pd.isna(aligned.loc["2026-03-30 01:00:00", "val"])
    assert aligned.loc["2026-03-30 01:00:00", "val_gap_flag"] == 1


def test_build_aligned_dataset_success() -> None:
    merged, report = build_aligned_dataset("heating")
    assert not merged.empty
    assert "occupancy_flag" in merged.columns
    assert "hour_of_day" in merged.columns
    assert "day_of_week" in merged.columns
    assert "is_weekend" in merged.columns
    assert "outside_temperature" in merged.columns
    assert "is_heating_required" in merged.columns
    assert "target_temp" in merged.columns
    
    assert report["window"] == "heating"
    assert "status_temperature_outside_in_celsius" in report["interpolation_counts"]


def test_save_and_load_processed(tmp_path: pathlib.Path) -> None:
    merged, report = build_aligned_dataset("heating")
    output_dir = str(tmp_path)
    
    file_path = save_processed(merged, "heating", output_dir=output_dir)
    assert pathlib.Path(file_path).exists()
    
    loaded = load_processed("heating", output_dir=output_dir)
    assert not loaded.empty
    assert loaded.index.name == "timestamp"
    assert "occupancy_flag" in loaded.columns
