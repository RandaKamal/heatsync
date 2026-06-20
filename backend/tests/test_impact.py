import impact.calculator as impact

DEVICE_COUNT = 4


def test_impact_by_device_uses_device_labels_and_window_breakdown() -> None:
    rows = impact.by_device()

    assert len(rows) == DEVICE_COUNT
    assert {row["device_name"] for row in rows} == {
        "Device 1",
        "Device 2",
        "Device 3",
        "Device 4",
    }
    assert all({"heating", "cooling"} <= set(row["by_window"]) for row in rows)


def test_impact_timeline_returns_bucketed_energy_rows() -> None:
    rows = impact.timeline("heating", "1h")

    assert rows
    first = rows[0]
    assert {"device_name", "timestamp", "avg_power_kw", "energy_kwh"} <= set(first)
    assert first["energy_kwh"] >= 0
