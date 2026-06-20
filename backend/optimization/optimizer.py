"""
Schedule consolidation optimizer.

Challenge brief context:
  "Would four units be enough instead of six? What other scenarios might be useful?"
  We identify when two rooms both run events simultaneously with low attendance,
  and suggest merging them into one room to save energy.

Energy model:
  Each room's heat pump array consumes avg_kw while conditioning.
  Savings = freed_room_avg_kw x overlap_duration_hours.

  main-space: 4 x ORIO-025, avg ~22 kW when conditioning
  hall-e:     2 units, avg ~11 kW
  tech-room:  1 unit,  avg ~5.5 kW

  These are conservative averages from the dataset power_draw.csv
  (mean power_draw_kw ≈ 2.32 kW per device during cooling window).
"""

from __future__ import annotations

EUR_PER_KWH = 0.25
CO2_KG_PER_KWH = 0.380

_ROOM_PROFILES: dict[str, dict] = {
    "main-space": {"name": "Main Space", "capacity": 200, "avg_kw": 22.0},
    "hall-e": {"name": "Hall E", "capacity": 80, "avg_kw": 11.0},
    "tech-room": {"name": "Technical Room", "capacity": 40, "avg_kw": 5.5},
}


def _hhmm_to_minutes(hhmm: str) -> int:
    h, m = map(int, hhmm.split(":"))
    return h * 60 + m


def _overlap_minutes(a: dict, b: dict) -> int:
    a_s, a_e = _hhmm_to_minutes(a["start"]), _hhmm_to_minutes(a["end"])
    b_s, b_e = _hhmm_to_minutes(b["start"]), _hhmm_to_minutes(b["end"])
    return max(0, min(a_e, b_e) - max(a_s, b_s))


def suggest_consolidation(events: list[dict]) -> dict | None:
    """
    Return the best consolidation opportunity or None if none exists.

    Algorithm:
    1. Find pairs of events in different rooms with overlapping times.
    2. Check whether combined attendance fits in either room.
    3. Pick the pair that yields the most kWh saved.
    4. Return a structured suggestion.
    """
    best: dict | None = None
    best_kwh = 0.0

    for i, ev_a in enumerate(events):
        for ev_b in events[i + 1 :]:
            if ev_a["roomId"] == ev_b["roomId"]:
                continue

            overlap_min = _overlap_minutes(ev_a, ev_b)
            if overlap_min <= 0:
                continue  # No time overlap

            combined = ev_a.get("expectedStudents", 50) + ev_b.get("expectedStudents", 50)

            # Try merging into either room
            for target_id in (ev_a["roomId"], ev_b["roomId"]):
                target = _ROOM_PROFILES.get(target_id)
                if not target or combined > target["capacity"]:
                    continue

                # The other room is freed
                move_event = ev_b if target_id == ev_a["roomId"] else ev_a
                freed_id = move_event["roomId"]
                freed = _ROOM_PROFILES.get(freed_id)
                if not freed:
                    continue

                overlap_h = overlap_min / 60.0
                saved_kwh = freed["avg_kw"] * overlap_h
                saved_eur = round(saved_kwh * EUR_PER_KWH, 2)
                saved_co2 = round(saved_kwh * CO2_KG_PER_KWH, 1)

                stay_event = ev_a if target_id == ev_a["roomId"] else ev_b
                reason = (
                    f"'{ev_a['title']}' and '{ev_b['title']}' both run "
                    f"{ev_a['start']}-{ev_a['end']} with a "
                    f"{overlap_min}-minute overlap. "
                    f"Moving '{move_event['title']}' "
                    f"({move_event.get('expectedStudents', 50)} students) "
                    f"into {target['name']} with '{stay_event['title']}' "
                    f"fills {combined}/{target['capacity']} seats "
                    f"and avoids heating {freed['name']} entirely."
                )

                if saved_kwh > best_kwh:
                    best_kwh = saved_kwh
                    best = {
                        "moveEventId": move_event["id"],
                        "moveEventTitle": move_event["title"],
                        "fromRoomId": freed_id,
                        "fromRoomName": freed["name"],
                        "toRoomId": target_id,
                        "toRoomName": target["name"],
                        "eventStart": move_event["start"],
                        "eventEnd": move_event["end"],
                        "combinedStudents": combined,
                        "toRoomCapacity": target["capacity"],
                        "reason": reason,
                        "savings": {
                            "kwh": round(saved_kwh, 1),
                            "eur": saved_eur,
                            "co2_kg": saved_co2,
                            "overlapMinutes": overlap_min,
                        },
                    }

    return best


def apply_suggestion(suggestion: dict, events: list[dict]) -> list[dict]:
    """
    Return a new event list with the moved event's roomId updated.
    Does NOT mutate the original list.
    """
    return [
        {**ev, "roomId": suggestion["toRoomId"]} if ev["id"] == suggestion["moveEventId"] else ev
        for ev in events
    ]
