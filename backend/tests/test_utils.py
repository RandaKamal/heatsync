import pathlib
from collections.abc import Callable

import pandas as pd
import pytest
from notebooks.utils import (
    align_to_15min,
    build_aligned_dataset,
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


def test_load_functions_work_correctly() -> None:
    df_snap = load_snapshots("heating")
    assert not df_snap.empty
    assert isinstance(df_snap.index, pd.DatetimeIndex)
    assert "device_id" in df_snap.columns

    df_int = load_intervals("heating")
    assert not df_int.empty
    assert isinstance(df_int.index, pd.DatetimeIndex)

    df_pwr = load_power_draw("heating")
    assert not df_pwr.empty
    assert "timestamp" in df_pwr.columns

    df_space = load_space_events("heating")
    assert not df_space.empty
    assert "starts_at" in df_space.columns


@pytest.mark.parametrize(
    ("file_type", "df", "expected_missing"),
    [
        (
            "snapshots",
            pd.DataFrame({"device_id": ["dev_1"], "last_seen_at": ["2026-03-30T00:00:00"]}),
            "status_temperature_outside_in_celsius",
        ),
        (
            "intervals",
            pd.DataFrame({"device_id": ["dev_1"], "interval_start_time": ["2026-03-30T00:00:00"]}),
            "space_uuid",
        ),
        ("power_draw", pd.DataFrame({"device_id": ["dev_1"]}), "timestamp"),
        ("space_events", pd.DataFrame({"starts_at": ["2026-03-30T00:00:00"]}), "ends_at"),
    ],
)
def test_validate_columns_raises_on_missing_required(
    file_type: str, df: pd.DataFrame, expected_missing: str
) -> None:
    with pytest.raises(ValueError, match=expected_missing):
        validate_columns(df, file_type, "dummy_path.csv")


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


def test_align_to_15min_resampling_and_imputation() -> None:
    times = pd.to_datetime(
        [
            "2026-03-30 00:00:00",
            "2026-03-30 00:15:00",
            "2026-03-30 00:45:00",
            "2026-03-30 01:45:00",
        ]
    )
    df = pd.DataFrame(
        {
            "device_id": ["dev_1"] * len(times),
            "val": [10.0, 11.0, 13.0, 15.0],
        },
        index=times,
    )

    aligned = align_to_15min(df, timestamp_col="timestamp")

    assert len(aligned) == EXPECTED_ALIGNED_ROWS_WITH_LONG_GAP
    assert aligned.loc["2026-03-30 00:30:00", "val"] == EXPECTED_SHORT_GAP_FILL_VALUE

    meta = aligned.attrs["interpolation_metadata"]
    assert meta["val"]["interpolated_count"] == 1
    assert meta["val"]["gap_count"] == 1

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
    merged, _report = build_aligned_dataset("heating")
    output_dir = str(tmp_path)

    file_path = save_processed(merged, "heating", output_dir=output_dir)
    assert pathlib.Path(file_path).exists()

    loaded = load_processed("heating", output_dir=output_dir)
    assert not loaded.empty
    assert loaded.index.name == "timestamp"
    assert "occupancy_flag" in loaded.columns


def test_load_processed_raises_for_missing_cache(tmp_path: pathlib.Path) -> None:
    with pytest.raises(FileNotFoundError, match="Processed file not found"):
        load_processed("heating", output_dir=str(tmp_path))
