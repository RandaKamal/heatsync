import warnings
warnings.filterwarnings("ignore")
import pandas as pd
import numpy as np
import sys
import os

sys.path.append(os.path.dirname(__file__))
from utils import load_processed, load_space_events

def build_device_level_features(df: pd.DataFrame, standby_baseline: float) -> pd.DataFrame:
    device_id_to_num = {
        "bdaf0e14-2cd1-43c8-b9ea-b3c90309f773": 1,
        "1c893f75-4599-4402-9d4c-1017aa858fa8": 2,
        "e72fea56-abe7-4d3f-a0ed-1e6b6c462157": 3,
        "930f3621-05df-4574-9270-9d994c5b716c": 4,
    }
    unique_timestamps = sorted(df.index.unique())
    wide_df = pd.DataFrame(index=unique_timestamps)
    wide_df.index.name = "timestamp"
    
    for dev_id, dev_num in device_id_to_num.items():
        dev_df = df[df["device_id"] == dev_id]
        dev_df = dev_df.reindex(unique_timestamps)
        
        power = dev_df["power_draw_kw"]
        was_adjusting = dev_df["was_adjusting_temperature"].fillna(0.0)
        active = ((was_adjusting == 1) | (power > standby_baseline)).astype(float)
        
        wide_df[f"device_{dev_num}_power_kw"] = power
        wide_df[f"device_{dev_num}_active"] = active
        
    return wide_df

def build_room_level_features(df: pd.DataFrame) -> pd.DataFrame:
    grouped = df.groupby("timestamp")
    
    timestamps = sorted(df.index.unique())
    room_df = pd.DataFrame(index=timestamps)
    room_df.index.name = "timestamp"
    
    room_df["room_temp"] = grouped["status_temperature_in_celsius"].median()
    room_df["room_return_temp"] = grouped["status_temperature_return_in_celsius"].median()
    room_df["room_humidity"] = grouped["status_humidity_in_percent"].median()
    room_df["room_co2"] = grouped["status_carbon_dioxide_in_ppm"].median()
    
    room_df["room_power_kw"] = grouped["power_draw_kw"].sum()
    room_df["room_energy_kwh"] = room_df["room_power_kw"] * 0.25
    
    if "outside_temperature" in df.columns:
        room_df["outside_temperature"] = grouped["outside_temperature"].first()
    elif "status_temperature_outside_in_celsius" in df.columns:
        room_df["outside_temperature"] = grouped["status_temperature_outside_in_celsius"].first()
        
    for col in ["hour_of_day", "day_of_week", "is_weekend", "occupancy_flag"]:
        if col in df.columns:
            room_df[col] = grouped[col].first()
            
    return room_df

def build_event_features(df_index: pd.DatetimeIndex, df_space: pd.DataFrame, preconditioning_window_hours: float = 2.0) -> pd.DataFrame:
    events = df_space.copy()
    events["starts_at"] = pd.to_datetime(events["starts_at"])
    events["ends_at"] = pd.to_datetime(events["ends_at"])
    events = events.sort_values("starts_at").reset_index(drop=True)
    
    event_active = []
    minutes_to_next_event = []
    minutes_since_previous_event = []
    next_event_start = []
    next_event_end = []
    
    for t in df_index:
        t_end = t + pd.Timedelta(minutes=15)
        is_active = 0
        for _, ev in events.iterrows():
            if t < ev["ends_at"] and t_end > ev["starts_at"]:
                is_active = 1
                break
        event_active.append(is_active)
        
        future_events = events[events["starts_at"] > t]
        if not future_events.empty:
            next_ev = future_events.iloc[0]
            m_to_next = (next_ev["starts_at"] - t).total_seconds() / 60.0
            next_start_dt = next_ev["starts_at"]
            next_end_dt = next_ev["ends_at"]
        else:
            m_to_next = np.nan
            next_start_dt = pd.NaT
            next_end_dt = pd.NaT
            
        minutes_to_next_event.append(m_to_next)
        next_event_start.append(next_start_dt)
        next_event_end.append(next_end_dt)
        
        past_events = events[events["ends_at"] <= t]
        if not past_events.empty:
            prev_ev = past_events.iloc[-1]
            m_since_prev = (t - prev_ev["ends_at"]).total_seconds() / 60.0
        else:
            m_since_prev = np.nan
        minutes_since_previous_event.append(m_since_prev)
        
    feat_df = pd.DataFrame(index=df_index)
    feat_df["event_active"] = event_active
    feat_df["minutes_to_next_event"] = minutes_to_next_event
    feat_df["minutes_since_previous_event"] = minutes_since_previous_event
    feat_df["next_event_start"] = next_event_start
    feat_df["next_event_end"] = next_event_end
    
    precond_min = preconditioning_window_hours * 60.0
    feat_df["inside_preconditioning_window"] = (
        (feat_df["minutes_to_next_event"] > 0) & 
        (feat_df["minutes_to_next_event"] <= precond_min) & 
        (feat_df["event_active"] == 0)
    ).astype(float)
    
    return feat_df

df_heating = load_processed("heating")
df_space = load_space_events("heating")
event_feats = build_event_features(df_heating.index.unique(), df_space)
print("Event features shape:", event_feats.shape)
print("Event features columns:", event_feats.columns.tolist())
print(event_feats.head())
print("Value counts of event_active:")
print(event_feats["event_active"].value_counts())
print("Value counts of inside_preconditioning_window:")
print(event_feats["inside_preconditioning_window"].value_counts())
