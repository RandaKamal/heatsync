import pandas as pd
import pytest

from notebooks.utils import (
    COMPARISON_TIMESERIES_COLUMNS,
    EVENT_CONTROL_REPORT_METRIC_COLUMNS,
    augment_event_control_report,
    build_event_control_comparison_timeseries,
    classify_event_control_status,
)


def _device_power_model(expected_devices: int = 2) -> dict[str, object]:
    return {
        "season": "heating",
        "expected_devices": expected_devices,
        "device_params": {
            f"device_{i}": {"active_power": float(i * 2), "standby_power": 0.1}
            for i in range(1, expected_devices + 1)
        },
    }


def _schedule_row(
    event_id: str,
    *,
    start_time: str,
    window_starts_at: str,
    window_ends_at: str,
    feasible: bool = True,
    comfort_violation_c: float = 0.0,
    device_1_on: int = 1,
    device_2_on: int = 0,
) -> dict[str, object]:
    return {
        "event_id": event_id,
        "mode": "heating",
        "start_time": pd.Timestamp(start_time),
        "device_1_on": device_1_on,
        "device_2_on": device_2_on,
        "device_3_on": 0,
        "device_4_on": 0,
        "target_temp": 20.0,
        "predicted_temp_at_start": 19.5,
        "expected_kwh": 0.5,
        "expected_cost": 0.1,
        "expected_co2": 0.2,
        "feasible": feasible,
        "selection_reason": "unit-test schedule",
        "comfort_violation_c": comfort_violation_c,
        "candidate_start_offset_minutes": 15,
        "active_device_count": device_1_on + device_2_on,
        "window_id": f"W-{event_id}",
        "window_starts_at": pd.Timestamp(window_starts_at),
        "window_ends_at": pd.Timestamp(window_ends_at),
    }


def test_comparison_timeseries_uses_measured_power_only_for_baseline() -> None:
    idx = pd.date_range("2026-03-30 00:00:00", periods=5, freq="15min")
    validation = pd.DataFrame(
        {
            "room_power_kw": [99.0, 99.0, 99.0, 99.0, 99.0],
            "power_draw_kw": [123.0, 123.0, 123.0, 123.0, 123.0],
            "room_temp": [20.0, 20.2, 20.4, 20.6, 20.8],
        },
        index=idx,
    )
    schedule = pd.DataFrame(
        [
            _schedule_row(
                "E1",
                start_time="2026-03-30 00:15:00",
                window_starts_at="2026-03-30 00:45:00",
                window_ends_at="2026-03-30 01:00:00",
                device_1_on=1,
                device_2_on=0,
            )
        ]
    )

    comparison = build_event_control_comparison_timeseries(
        validation,
        schedule,
        _device_power_model(expected_devices=2),
        electricity_price=0.20,
        co2_factor=0.50,
        comfort_min=19.0,
        comfort_max=21.0,
        expected_devices=2,
    )

    assert list(comparison.columns[: len(COMPARISON_TIMESERIES_COLUMNS)]) == COMPARISON_TIMESERIES_COLUMNS
    assert comparison.loc[idx[1], "baseline_power_kw"] == pytest.approx(99.0)
    assert comparison.loc[idx[1], "smart_power_kw"] == pytest.approx(2.1)
    assert comparison.loc[idx[1], "smart_power_kw"] != pytest.approx(
        comparison.loc[idx[1], "baseline_power_kw"]
    )
    assert comparison.loc[idx[1], "smart_device_1_active"] == 1.0
    assert comparison.loc[idx[1], "smart_device_2_active"] == 0.0
    assert comparison.loc[idx[1], "smart_kwh"] == pytest.approx(2.1 * 0.25)
    assert comparison.loc[idx[1], "smart_cost_eur"] == pytest.approx(2.1 * 0.25 * 0.20)
    assert comparison.loc[idx[-1], "cumulative_baseline_kwh"] == pytest.approx(99.0 * 0.25 * 5)
    assert comparison.loc[idx[-1], "cumulative_smart_kwh"] == pytest.approx(comparison["smart_kwh"].sum())


def test_augmented_report_preserves_edge_case_rows_and_statuses() -> None:
    schedule = pd.DataFrame(
        [
            _schedule_row(
                "E_infeasible",
                start_time="2026-03-30 01:00:00",
                window_starts_at="2026-03-30 01:15:00",
                window_ends_at="2026-03-30 01:30:00",
                feasible=False,
                comfort_violation_c=1.2,
            ),
            _schedule_row(
                "E_missed",
                start_time="2026-03-30 02:00:00",
                window_starts_at="2026-03-30 02:15:00",
                window_ends_at="2026-03-30 02:30:00",
                feasible=True,
                comfort_violation_c=0.4,
            ),
            _schedule_row(
                "E_negative",
                start_time="2026-03-30 03:00:00",
                window_starts_at="2026-03-30 03:15:00",
                window_ends_at="2026-03-30 03:30:00",
                feasible=True,
                comfort_violation_c=0.0,
                device_1_on=1,
                device_2_on=1,
            ),
            _schedule_row(
                "E_neutral",
                start_time="2026-03-30 04:00:00",
                window_starts_at="2026-03-30 04:15:00",
                window_ends_at="2026-03-30 04:30:00",
                feasible=True,
                comfort_violation_c=0.0,
                device_1_on=0,
                device_2_on=0,
            ),
        ]
    )
    idx = pd.DatetimeIndex(
        [
            "2026-03-30 01:00:00",
            "2026-03-30 01:15:00",
            "2026-03-30 02:00:00",
            "2026-03-30 02:15:00",
            "2026-03-30 03:00:00",
            "2026-03-30 03:15:00",
            "2026-03-30 04:00:00",
            "2026-03-30 04:15:00",
        ]
    )
    validation = pd.DataFrame(
        {
            "room_power_kw": [8.0, 8.0, 8.0, 8.0, 1.0, 1.0, 0.2, 0.2],
            "room_temp": [18.0, 18.2, 18.4, 18.6, 20.0, 20.0, 20.0, 20.0],
        },
        index=idx,
    )

    comparison = build_event_control_comparison_timeseries(
        validation,
        schedule,
        _device_power_model(expected_devices=2),
        electricity_price=1.0,
        co2_factor=1.0,
        comfort_min=19.0,
        comfort_max=21.0,
        expected_devices=2,
    )
    report = augment_event_control_report(
        schedule,
        comparison,
        comfort_min=19.0,
        comfort_max=21.0,
    )

    assert list(report["event_id"]) == ["E_infeasible", "E_missed", "E_negative", "E_neutral"]
    assert all(col in report.columns for col in EVENT_CONTROL_REPORT_METRIC_COLUMNS)
    assert set(schedule.columns).issubset(report.columns)
    assert report.set_index("event_id").loc["E_infeasible", "report_status"] == "infeasible"
    assert report.set_index("event_id").loc["E_missed", "report_status"] == "comfort_missed"
    assert report.set_index("event_id").loc["E_negative", "report_status"] == "negative_savings"
    assert report.set_index("event_id").loc["E_neutral", "report_status"] == "neutral_savings"
    assert report.set_index("event_id").loc["E_negative", "energy_savings_kwh"] < 0.0
    assert report.set_index("event_id").loc["E_neutral", "energy_savings_kwh"] == pytest.approx(0.0)


def test_reporting_helpers_reject_malformed_inputs() -> None:
    idx = pd.date_range("2026-03-30 00:00:00", periods=1, freq="15min")
    validation = pd.DataFrame({"room_power_kw": [1.0], "room_temp": [20.0]}, index=idx)
    schedule = pd.DataFrame(
        [
            _schedule_row(
                "E1",
                start_time="2026-03-30 00:00:00",
                window_starts_at="2026-03-30 00:15:00",
                window_ends_at="2026-03-30 00:30:00",
            )
        ]
    )

    with pytest.raises(ValueError, match="DatetimeIndex"):
        build_event_control_comparison_timeseries(validation.reset_index(), schedule, _device_power_model())

    with pytest.raises(ValueError, match="schedule_df missing required columns"):
        build_event_control_comparison_timeseries(validation, schedule.drop(columns=["start_time"]), _device_power_model())

    with pytest.raises(ValueError, match="baseline power column"):
        build_event_control_comparison_timeseries(validation.drop(columns=["room_power_kw"]), schedule, _device_power_model())

    status, reason = classify_event_control_status(
        feasible=True,
        comfort_violation_c=0.0,
        cost_savings_eur=0.0,
    )
    assert status == "neutral_savings"
    assert "near zero" in reason
