import pandas as pd
import pytest
from backend.data import loader

DEVICE_COUNT = 4


def test_loader_uses_synthetic_data_without_file_reads(monkeypatch: pytest.MonkeyPatch) -> None:
    def fail_read_csv(*args: object, **kwargs: object) -> pd.DataFrame:
        raise AssertionError("synthetic loader must not read CSV files")

    monkeypatch.setattr(pd, "read_csv", fail_read_csv)

    assert len(loader.devices()) == DEVICE_COUNT
    assert not loader.snapshots("heating").empty
    assert not loader.power_draw("cooling").empty
    assert not loader.intervals("heating").empty
    assert not loader.space_events("cooling").empty


def test_devices_loads_synthetic_device_contract() -> None:
    df = loader.devices()

    assert len(df) == DEVICE_COUNT
    assert {"device_id", "label", "type", "hardware_version"} <= set(df.columns)
    assert set(df["label"]) == {"Device 1", "Device 2", "Device 3", "Device 4"}
    assert df["hardware_version"].eq("synthetic").all()


def test_windowed_loaders_parse_timestamps_and_attach_window() -> None:
    snapshots = loader.snapshots("heating")
    power = loader.power_draw("cooling")
    intervals = loader.intervals("heating")
    events = loader.space_events("cooling")

    assert not snapshots.empty
    assert snapshots["window"].eq("heating").all()
    assert pd.api.types.is_datetime64_any_dtype(snapshots["last_seen_at"])

    assert not power.empty
    assert power["window"].eq("cooling").all()
    assert pd.api.types.is_datetime64_any_dtype(power["timestamp"])

    assert not intervals.empty
    assert intervals["start"].equals(intervals["interval_start_time"])
    assert intervals["end"].equals(intervals["interval_end_time"])

    assert not events.empty
    assert events["event_name"].equals(events["name"])
    assert pd.api.types.is_datetime64_any_dtype(events["starts_at"])


def test_all_loaders_include_both_windows() -> None:
    assert set(loader.snapshots_all()["window"]) == {"heating", "cooling"}
    assert set(loader.power_draw_all()["window"]) == {"heating", "cooling"}
    assert set(loader.intervals_all()["window"]) == {"heating", "cooling"}


def test_unknown_window_raises_actionable_error() -> None:
    with pytest.raises(ValueError, match="Unknown window 'summer'"):
        loader.snapshots("summer")
