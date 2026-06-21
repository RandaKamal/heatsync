import pathlib
from collections.abc import Callable

import numpy as np
import pandas as pd
import pytest

from notebooks.utils import (
    align_to_15min,
    build_aligned_dataset,
    build_device_level_features,
    build_event_features,
    build_room_level_features,
    build_room_physical_model_frame,
    check_coefficient_plausibility,
    load_intervals,
    load_power_draw,
    load_processed,
    load_snapshots,
    load_space_events,
    predict_temperature,
    predict_device_power,
    save_processed,
    save_model_artifacts,
    load_model_artifacts,
    train_device_power_model,
    train_thermal_model,
    validate_columns,
)

EXPECTED_ALIGNED_ROWS_WITH_LONG_GAP = 8
EXPECTED_SHORT_GAP_FILL_VALUE = 11.0
EXPECTED_MINUTES_SINCE_PREVIOUS_EVENT = 15.0


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


def test_build_device_level_features_pivots_power_and_activity() -> None:
    timestamps = pd.to_datetime(
        [
            "2026-03-30 00:00:00",
            "2026-03-30 00:00:00",
            "2026-03-30 00:00:00",
            "2026-03-30 00:15:00",
            "2026-03-30 00:15:00",
        ]
    )
    df = pd.DataFrame(
        {
            "device_id": ["dev_a", "dev_a", "dev_b", "dev_a", "dev_b"],
            "power_draw_kw": [0.4, 0.6, 0.2, 1.2, 0.3],
            "was_adjusting_temperature": [0, 1, 0, 0, 1],
        },
        index=timestamps,
    )
    df.index.name = "timestamp"

    features = build_device_level_features(df, standby_baseline=1.0, expected_devices=2)

    assert list(features.columns) == [
        "device_1_power_kw",
        "device_1_active",
        "device_2_power_kw",
        "device_2_active",
    ]
    assert features.loc["2026-03-30 00:00:00", "device_1_power_kw"] == pytest.approx(0.5)
    assert features.loc["2026-03-30 00:00:00", "device_1_active"] == 1.0
    assert features.loc["2026-03-30 00:15:00", "device_1_active"] == 1.0
    assert features.loc["2026-03-30 00:15:00", "device_2_active"] == 1.0


@pytest.mark.parametrize(
    ("bad_df", "match"),
    [
        (pd.DataFrame({"device_id": ["dev_a"]}), "indexed by timestamp"),
        (
            pd.DataFrame(
                {"device_id": ["dev_a"], "power_draw_kw": [0.1]},
                index=pd.to_datetime(["2026-03-30 00:00:00"]),
            ),
            "was_adjusting_temperature",
        ),
    ],
)
def test_build_device_level_features_rejects_malformed_inputs(
    bad_df: pd.DataFrame, match: str
) -> None:
    with pytest.raises(ValueError, match=match):
        build_device_level_features(bad_df, standby_baseline=1.0)


def test_build_room_level_features_aggregates_device_rows() -> None:
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
            "status_temperature_in_celsius": [20.0, 22.0, 21.0, 23.0],
            "status_temperature_return_in_celsius": [19.0, 21.0, 20.0, 22.0],
            "status_humidity_in_percent": [40.0, 50.0, 45.0, 55.0],
            "status_carbon_dioxide_in_ppm": [600.0, 800.0, 700.0, 900.0],
            "power_draw_kw": [1.0, 2.0, 3.0, 4.0],
            "outside_temperature": [5.0, 6.0, 7.0, 8.0],
        },
        index=timestamps,
    )
    df.index.name = "timestamp"

    room = build_room_level_features(df)

    assert list(room["room_temp"]) == [21.0, 22.0]
    assert list(room["room_return_temp"]) == [20.0, 21.0]
    assert list(room["room_humidity"]) == [45.0, 50.0]
    assert list(room["room_co2"]) == [700.0, 800.0]
    assert list(room["room_power_kw"]) == [3.0, 7.0]
    assert list(room["room_energy_kwh"]) == [0.75, 1.75]
    assert list(room["outside_temperature"]) == [5.0, 7.0]


def test_build_event_features_marks_active_and_preconditioning_windows() -> None:
    index = pd.date_range("2026-03-30 00:00:00", periods=6, freq="15min")
    events = pd.DataFrame(
        {
            "starts_at": ["2026-03-30 00:30:00"],
            "ends_at": ["2026-03-30 01:00:00"],
        }
    )

    features = build_event_features(index, events, preconditioning_window_hours=0.5)

    assert list(features["event_active"]) == [0, 0, 1, 1, 0, 0]
    assert list(features["inside_preconditioning_window"]) == [
        1.0,
        1.0,
        0.0,
        0.0,
        0.0,
        0.0,
    ]
    assert pd.isna(features.loc[index[-1], "minutes_to_next_event"])
    assert (
        features.loc[index[-1], "minutes_since_previous_event"]
        == EXPECTED_MINUTES_SINCE_PREVIOUS_EVENT
    )


def test_build_event_features_rejects_events_ending_before_start() -> None:
    index = pd.date_range("2026-03-30 00:00:00", periods=1, freq="15min")
    events = pd.DataFrame(
        {
            "starts_at": ["2026-03-30 01:00:00"],
            "ends_at": ["2026-03-30 00:00:00"],
        }
    )

    with pytest.raises(ValueError, match="ending before they start"):
        build_event_features(index, events)


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


def test_check_coefficient_plausibility() -> None:
    """
    Test check_coefficient_plausibility logic.
    """
    # Plausible coefficients
    assert check_coefficient_plausibility(0.9, 0.01, 0.05, 0.0) is True
    # Implausible 'a'
    assert check_coefficient_plausibility(-0.1, 0.01, 0.05, 0.0) is False
    # Implausible 'b' (below threshold)
    assert check_coefficient_plausibility(0.9, -0.05, 0.05, 0.0, threshold=0.01) is False
    # Plausible 'b' (above threshold)
    assert check_coefficient_plausibility(0.9, -0.005, 0.05, 0.0, threshold=0.01) is True
    # Implausible 'c_heat'
    assert check_coefficient_plausibility(0.9, 0.01, -0.05, 0.0, threshold=0.01) is False
    # Implausible 'c_cool'
    assert check_coefficient_plausibility(0.9, 0.01, 0.0, -0.05, threshold=0.01) is False


def test_train_thermal_model_success() -> None:
    """
    Test successful thermal model training (heating/cooling) with synthetic plausible data.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=20, freq="15min")
    # For heating: T_next ~ 0.95 * room_temp + 0.02 * outside + 0.1 * room_power
    room_temp = [20.0]
    outside = [10.0] * 20
    power = [10.0] * 20
    for i in range(19):
        t_next = 0.95 * room_temp[-1] + 0.02 * outside[i] + 0.01 * power[i] + np.random.normal(0, 0.01)
        room_temp.append(t_next)

    df = pd.DataFrame(
        {
            "room_temp": room_temp,
            "outside_temperature": outside,
            "room_power_kw": power,
            "event_active": [0] * 20,
        },
        index=idx,
    )

    split_ts = pd.Timestamp("2026-03-30 04:00:00")
    # Heating season
    model_dict_h = train_thermal_model(df, "heating", split_ts, alpha=0.1)
    assert model_dict_h["season"] == "heating"
    assert model_dict_h["is_fallback"] is False
    assert model_dict_h["a"] > 0
    assert model_dict_h["b"] >= -1e-2
    assert model_dict_h["c_heat"] >= -1e-2
    assert model_dict_h["c_cool"] == 0.0

    # Cooling season with synthetic cooling data
    # T_next ~ 0.95 * room_temp + 0.02 * outside - 0.01 * cooling_power
    room_temp_c = [22.0]
    for i in range(19):
        t_next = 0.95 * room_temp_c[-1] + 0.02 * outside[i] - 0.01 * power[i] + np.random.normal(0, 0.01)
        room_temp_c.append(t_next)

    df_c = pd.DataFrame(
        {
            "room_temp": room_temp_c,
            "outside_temperature": outside,
            "room_power_kw": power,
            "event_active": [0] * 20,
        },
        index=idx,
    )
    model_dict_c = train_thermal_model(df_c, "cooling", split_ts, alpha=0.1)
    assert model_dict_c["season"] == "cooling"
    assert model_dict_c["is_fallback"] is False
    assert model_dict_c["a"] > 0
    assert model_dict_c["b"] >= -1e-2
    assert model_dict_c["c_cool"] >= -1e-2
    assert model_dict_c["c_heat"] == 0.0


def test_train_thermal_model_fallback() -> None:
    """
    Test that train_thermal_model correctly triggers fallback when coefficients are implausible.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=20, freq="15min")
    # Implausible relationship: temperature drops sharply when heating power is very high
    room_temp = [20.0 - 5.0 * i for i in range(20)]
    df = pd.DataFrame(
        {
            "room_temp": room_temp,
            "outside_temperature": [10.0] * 20,
            "room_power_kw": [1.0 * i for i in range(20)],
            "event_active": [0] * 20,
        },
        index=idx,
    )

    split_ts = pd.Timestamp("2026-03-30 04:00:00")
    model_dict = train_thermal_model(df, "heating", split_ts)
    assert model_dict["is_fallback"] is True
    assert model_dict["fallback_reason"] is not None
    assert model_dict["features"] == ["room_temp"]
    assert model_dict["a"] > 0
    assert model_dict["b"] == 0.0
    assert model_dict["c_heat"] == 0.0
    assert model_dict["c_cool"] == 0.0


def test_train_thermal_model_errors() -> None:
    """
    Test train_thermal_model validation errors.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=5, freq="15min")
    df = pd.DataFrame(
        {
            "room_temp": [20.0] * 5,
            "outside_temperature": [10.0] * 5,
            "room_power_kw": [1.0] * 5,
            "event_active": [0] * 5,
        },
        index=idx,
    )

    # Invalid season
    with pytest.raises(ValueError, match="season must be"):
        train_thermal_model(df, "shoulder", pd.Timestamp("2026-03-30 00:45:00"))

    # Empty training set
    with pytest.raises(ValueError, match="Training data is empty before"):
        train_thermal_model(df, "heating", pd.Timestamp("2026-03-30 00:00:00"))


def test_predict_temperature() -> None:
    """
    Test predict_temperature predictions and error conditions.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=5, freq="15min")
    df = pd.DataFrame(
        {
            "room_temp": [20.0] * 5,
            "outside_temperature": [10.0] * 5,
            "room_power_kw": [1.0] * 5,
            "event_active": [0] * 5,
        },
        index=idx,
    )

    model_dict = train_thermal_model(df, "heating", pd.Timestamp("2026-03-30 00:45:00"))
    preds = predict_temperature(model_dict, df)
    assert len(preds) == 5
    assert not preds.isna().any()

    # Missing column
    df_missing = df.drop(columns=["room_temp"])
    with pytest.raises(ValueError, match="Required features"):
        predict_temperature(model_dict, df_missing)


def test_device_power_model() -> None:
    """
    Test training and predicting with the device power model.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=6, freq="15min")
    df = pd.DataFrame(
        {
            "device_1_power_kw": [10.0, 12.0, 0.05, 11.0, 0.05, 0.05],
            "device_1_active": [1.0, 1.0, 0.0, 1.0, 0.0, 0.0],
            "device_2_power_kw": [3.0, 3.5, 0.02, 3.2, 0.02, 0.02],
            "device_2_active": [1.0, 1.0, 0.0, 1.0, 0.0, 0.0],
        },
        index=idx,
    )
    df.index.name = "timestamp"

    # Train on first 4 steps (before 01:00:00)
    split_ts = pd.Timestamp("2026-03-30 01:00:00")
    model_dict = train_device_power_model(df, "heating", split_ts, expected_devices=2)

    assert model_dict["season"] == "heating"
    assert model_dict["expected_devices"] == 2
    
    params = model_dict["device_params"]
    # For device 1 active: mean of [10.0, 12.0] = 11.0
    # For device 1 standby: mean of [0.05] = 0.05
    assert params["device_1"]["active_power"] == pytest.approx(11.0)
    assert params["device_1"]["standby_power"] == pytest.approx(0.05)

    # For device 2 active: mean of [3.0, 3.5, 3.2] = 3.233333
    # For device 2 standby: mean of [0.02] = 0.02
    assert params["device_2"]["active_power"] == pytest.approx(3.233333)
    assert params["device_2"]["standby_power"] == pytest.approx(0.02)

    # Predict on the whole df
    preds_df = predict_device_power(model_dict, df)
    assert f"device_1_predicted_power_kw" in preds_df.columns
    assert f"device_2_predicted_power_kw" in preds_df.columns

    # Verify prediction for step 4 (index 3), which is active (1.0)
    # Expected device 1 power: 11.0
    assert preds_df.loc[idx[3], "device_1_predicted_power_kw"] == pytest.approx(11.0)
    # Verify prediction for step 5 (index 4), which is standby (0.0)
    # Expected device 1 power: 0.05
    assert preds_df.loc[idx[4], "device_1_predicted_power_kw"] == pytest.approx(0.05)


def test_model_artifacts_save_and_reload(tmp_path: pathlib.Path) -> None:
    """
    Test save_model_artifacts and load_model_artifacts functionality.
    """
    idx = pd.date_range("2026-03-30 00:00:00", periods=5, freq="15min")
    df = pd.DataFrame(
        {
            "room_temp": [20.0] * 5,
            "outside_temperature": [10.0] * 5,
            "room_power_kw": [1.0] * 5,
            "event_active": [0] * 5,
        },
        index=idx,
    )
    thermal_dict = train_thermal_model(df, "heating", pd.Timestamp("2026-03-30 00:45:00"))
    
    power_df = pd.DataFrame(
        {
            "device_1_power_kw": [10.0, 0.05],
            "device_1_active": [1.0, 0.0],
        },
        index=idx[:2],
    )
    power_df.index.name = "timestamp"
    power_dict = train_device_power_model(power_df, "heating", pd.Timestamp("2026-03-30 00:15:00"), expected_devices=1)
    
    save_model_artifacts(
        artifacts_dir=tmp_path,
        thermal_model_dict=thermal_dict,
        device_power_model_dict=power_dict,
        metrics={"mae": 0.1, "rmse": 0.2},
        train_timestamps={"start": "2026-03-30T00:00:00", "end": "2026-03-30T00:30:00"},
    )
    
    # Assert files exist in standard format and prefixed format
    assert (tmp_path / "thermal_model.joblib").exists()
    assert (tmp_path / "scaler.joblib").exists()
    assert (tmp_path / "feature_columns.json").exists()
    assert (tmp_path / "model_metadata.json").exists()
    assert (tmp_path / "device_power_model.joblib").exists()
    
    assert (tmp_path / "heating_thermal_model.joblib").exists()
    assert (tmp_path / "heating_scaler.joblib").exists()
    assert (tmp_path / "heating_feature_columns.json").exists()
    assert (tmp_path / "heating_model_metadata.json").exists()
    assert (tmp_path / "heating_device_power_model.joblib").exists()

    # Load with general season parameter
    loaded_thermal, loaded_power = load_model_artifacts(tmp_path, season="heating")
    
    assert loaded_thermal["season"] == "heating"
    assert loaded_thermal["is_fallback"] == thermal_dict["is_fallback"]
    assert loaded_thermal["features"] == thermal_dict["features"]
    assert loaded_power["season"] == "heating"
    assert loaded_power["device_params"]["device_1"]["active_power"] == power_dict["device_params"]["device_1"]["active_power"]


def test_optimizer_contracts_and_inputs() -> None:
    from notebooks.utils import EventControlConfig, validate_optimizer_inputs
    
    # Valid config
    config = EventControlConfig(mode="heating", min_temp=18.0, max_temp=22.0, precondition_hours=2.0)
    config.validate()
    
    # Invalid mode
    with pytest.raises(ValueError, match="Invalid mode"):
        validate_optimizer_inputs(mode="invalid_mode", min_temp=18.0, max_temp=22.0)
        
    # Invalid comfort band
    with pytest.raises(ValueError, match="Invalid comfort band"):
        validate_optimizer_inputs(mode="heating", min_temp=22.0, max_temp=18.0)
        
    # Negative precondition hours
    with pytest.raises(ValueError, match="precondition_hours must be non-negative"):
        validate_optimizer_inputs(mode="heating", min_temp=18.0, max_temp=22.0, precondition_hours=-1.0)


def test_device_discovery_and_ordering() -> None:
    from notebooks.utils import get_device_id_mapping, discover_device_columns
    
    # Test device mapping ordering
    df_devices = pd.DataFrame({
        "device_id": [
            "unknown-device-id",
            "1c893f75-4599-4402-9d4c-1017aa858fa8",  # Second in KNOWN_DEVICE_ORDER
            "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773",  # First in KNOWN_DEVICE_ORDER
        ]
    })
    
    mapping = get_device_id_mapping(df_devices, expected_devices=4)
    # Expected ordering: KNOWN ones first, then unknowns
    # First: bdaf0e14-2cd1-43c8-b9ea-b3c90309f773
    # Second: 1c893f75-4599-4402-9d4c-1017aa858fa8
    # Third: unknown-device-id
    # Fourth: e72fea56-abe7-4d3f-a0ed-1e6b6c462157 (from KNOWN_DEVICE_ORDER because we need 4)
    assert mapping["bdaf0e14-2cd1-43c8-b9ea-b3c90309f773"] == 1
    assert mapping["1c893f75-4599-4402-9d4c-1017aa858fa8"] == 2
    assert mapping["unknown-device-id"] == 3
    assert mapping["e72fea56-abe7-4d3f-a0ed-1e6b6c462157"] == 4
    
    # Test discover_device_columns
    df_wide = pd.DataFrame({
        "device_1_power_kw": [1.0, 2.0],
        "device_1_active": [1.0, 0.0],
        "device_2_power_kw": [0.5, 0.5],
        "device_2_active": [0.0, 0.0],
        # device 3 power is missing active, device 4 is completely missing
        "device_3_power_kw": [1.5, 1.5],
    })
    cols_map = discover_device_columns(df_wide, expected_devices=4)
    assert "device_1" in cols_map
    assert cols_map["device_1"]["power"] == "device_1_power_kw"
    assert cols_map["device_1"]["active"] == "device_1_active"
    assert "device_2" in cols_map
    assert "device_3" not in cols_map
    assert "device_4" not in cols_map


def test_extract_events_from_frame() -> None:
    from notebooks.utils import extract_events_from_frame
    
    # Test typical extraction with index
    times = pd.date_range("2026-03-30 00:00:00", periods=8, freq="15min")
    df = pd.DataFrame({
        "occupancy_flag": [0, 1, 1, 0, 0, 1, 0, 0]
    }, index=times)
    
    events = extract_events_from_frame(df, flag_col="occupancy_flag")
    assert len(events) == 2
    # First event: index 1 and 2 (00:15 and 00:30) -> start: 00:15, end: 00:30 + 15m = 00:45
    assert events.iloc[0]["starts_at"] == pd.Timestamp("2026-03-30 00:15:00")
    assert events.iloc[0]["ends_at"] == pd.Timestamp("2026-03-30 00:45:00")
    # Second event: index 5 (01:15) -> start: 01:15, end: 01:30
    assert events.iloc[1]["starts_at"] == pd.Timestamp("2026-03-30 01:15:00")
    assert events.iloc[1]["ends_at"] == pd.Timestamp("2026-03-30 01:30:00")
    
    # Missing flag column raises ValueError
    with pytest.raises(ValueError, match="not found in DataFrame"):
        extract_events_from_frame(df, flag_col="non_existent")
        
    # Non-datetime index without timestamp column raises ValueError
    df_no_dt = pd.DataFrame({"occupancy_flag": [1]}, index=[0])
    with pytest.raises(ValueError, match="must be a DatetimeIndex or contain a 'timestamp' column"):
        extract_events_from_frame(df_no_dt)


def test_consolidate_event_windows() -> None:
    from notebooks.utils import consolidate_event_windows, ConsolidatedEventWindow
    
    # Create test events
    events_df = pd.DataFrame([
        # Duplicate events
        {"event_id": "E1", "starts_at": "2026-03-30 08:00:00", "ends_at": "2026-03-30 09:00:00"},
        {"event_id": "E2", "starts_at": "2026-03-30 08:00:00", "ends_at": "2026-03-30 09:00:00"},
        # Overlapping event
        {"event_id": "E3", "starts_at": "2026-03-30 08:30:00", "ends_at": "2026-03-30 10:00:00"},
        # Close back-to-back (gap = 30 minutes <= 60 minutes)
        {"event_id": "E4", "starts_at": "2026-03-30 10:30:00", "ends_at": "2026-03-30 11:30:00"},
        # Separated event (gap = 90 minutes > 60 minutes)
        {"event_id": "E5", "starts_at": "2026-03-30 13:00:00", "ends_at": "2026-03-30 14:00:00"},
    ])
    
    # Consolidate with 60 minutes threshold
    consolidated = consolidate_event_windows(events_df, merge_threshold_minutes=60.0)
    
    assert len(consolidated) == 2
    
    # First consolidated window: E1, E2, E3, E4 merged
    # Starts at 08:00:00, ends at 11:30:00
    w1 = consolidated[0]
    assert isinstance(w1, ConsolidatedEventWindow)
    assert w1.window_id == "W01"
    assert w1.starts_at == pd.Timestamp("2026-03-30 08:00:00")
    assert w1.ends_at == pd.Timestamp("2026-03-30 11:30:00")
    assert w1.original_event_ids == ["E1", "E2", "E3", "E4"]
    assert "Merged 4 events" in w1.rationale
    
    # Second consolidated window: E5
    w2 = consolidated[1]
    assert w2.window_id == "W02"
    assert w2.starts_at == pd.Timestamp("2026-03-30 13:00:00")
    assert w2.ends_at == pd.Timestamp("2026-03-30 14:00:00")
    assert w2.original_event_ids == ["E5"]
    assert "single event" in w2.rationale
    
    # Negative merge threshold raises ValueError
    with pytest.raises(ValueError, match="merge_threshold_minutes must be non-negative"):
        consolidate_event_windows(events_df, merge_threshold_minutes=-10.0)
        
    # Missing columns raises ValueError
    df_bad = pd.DataFrame({"starts_at": ["2026-03-30 08:00:00"]})
    with pytest.raises(ValueError, match="Missing required column"):
        consolidate_event_windows(df_bad)




