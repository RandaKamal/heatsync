from backend.data import loader

from app import create_app

HTTP_OK = 200
DEVICE_COUNT = 4
SNAPSHOT_LIMIT = 2


def test_health_endpoint_returns_ok() -> None:
    client = create_app().test_client()

    response = client.get("/api/health")

    assert response.status_code == HTTP_OK
    assert response.get_json() == {"status": "ok"}


def test_devices_endpoint_returns_synthetic_devices_with_positions() -> None:
    client = create_app().test_client()

    response = client.get("/api/devices")

    assert response.status_code == HTTP_OK
    devices = response.get_json()
    assert len(devices) == DEVICE_COUNT
    assert all(device["device_id"] for device in devices)
    assert all("position" in device for device in devices)
    assert {device["label"] for device in devices} == {
        "Device 1",
        "Device 2",
        "Device 3",
        "Device 4",
    }


def test_device_snapshots_endpoint_uses_synthetic_window_data() -> None:
    client = create_app().test_client()
    device_id = loader.devices().iloc[0]["device_id"]

    response = client.get(
        f"/api/devices/{device_id}/snapshots?window=heating&limit={SNAPSHOT_LIMIT}"
    )

    assert response.status_code == HTTP_OK
    rows = response.get_json()
    assert 1 <= len(rows) <= SNAPSHOT_LIMIT
    assert {row["device_id"] for row in rows} == {device_id}
    assert all("last_seen_at" in row for row in rows)


def test_impact_summary_endpoint_returns_window_and_total_metrics() -> None:
    client = create_app().test_client()

    response = client.get("/api/impact/summary")

    assert response.status_code == HTTP_OK
    payload = response.get_json()
    assert set(payload) == {"heating", "cooling", "total"}
    assert payload["total"]["energy_saved_kwh"] > 0
