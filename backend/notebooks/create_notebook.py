import nbformat as nbf

nb = nbf.v4.new_notebook()

cells = [
    nbf.v4.new_markdown_cell(
        "# 07_event_based_device_control: Notebook Scaffold and Device-Level Data Pipeline\n\n"
        "This notebook establishes the complete data pipeline from raw CSVs through 15-minute aligned "
        "device-level and room-level features for event-based control."
    ),
    nbf.v4.new_code_cell(
        "import os\n"
        "import sys\n"
        "import warnings\n"
        "import pandas as pd\n"
        "import numpy as np\n\n"
        "warnings.filterwarnings('ignore')\n"
        "%matplotlib inline\n\n"
        "# Resolve backend/notebooks directory for imports\n"
        "sys.path.append(os.path.abspath('.'))\n"
        "from utils import (\n"
        "    load_processed,\n"
        "    load_space_events,\n"
        "    build_device_level_features,\n"
        "    build_event_features,\n"
        "    build_room_level_features,\n"
        ")"
    ),
    nbf.v4.new_markdown_cell("## 1. Configurations"),
    nbf.v4.new_code_cell(
        "comfort_config = {\n"
        "    't_min_occupied_celsius': 20.0,\n"
        "    't_max_occupied_celsius': 24.0,\n"
        "    't_min_unoccupied_celsius': 16.0,\n"
        "    't_max_unoccupied_celsius': 28.0,\n"
        "    'relative_humidity_min_percent': 30.0,\n"
        "    'relative_humidity_max_percent': 60.0,\n"
        "}\n\n"
        "control_config = {\n"
        "    'preconditioning_window_hours': 2.0,\n"
        "    'standby_baseline_heating': 1.2,\n"
        "    'standby_baseline_cooling': 2.0,\n"
        "}\n\n"
        "energy_config = {\n"
        "    'electricity_price_eur_per_kWh': 0.35,\n"
        "    'co2_kg_per_kWh': 0.40,\n"
        "}"
    ),
    nbf.v4.new_markdown_cell("## 2. Data Loading & Feature Engineering"),
    nbf.v4.new_code_cell(
        "# Load seasonal processed datasets\n"
        "df_heating_raw = load_processed('heating')\n"
        "df_cooling_raw = load_processed('cooling')\n\n"
        "# Load space events\n"
        "events_heating = load_space_events('heating')\n"
        "events_cooling = load_space_events('cooling')\n\n"
        "# Build device-level features (wide format)\n"
        "df_dev_heating = build_device_level_features(\n"
        "    df_heating_raw, standby_baseline=control_config['standby_baseline_heating']\n"
        ")\n"
        "df_dev_cooling = build_device_level_features(\n"
        "    df_cooling_raw, standby_baseline=control_config['standby_baseline_cooling']\n"
        ")\n\n"
        "# Build room-level features\n"
        "df_room_heating = build_room_level_features(df_heating_raw)\n"
        "df_room_cooling = build_room_level_features(df_cooling_raw)\n\n"
        "# Build event features\n"
        "df_evt_heating = build_event_features(\n"
        "    df_room_heating.index,\n"
        "    events_heating,\n"
        "    preconditioning_window_hours=control_config['preconditioning_window_hours'],\n"
        ")\n"
        "df_evt_cooling = build_event_features(\n"
        "    df_room_cooling.index,\n"
        "    events_cooling,\n"
        "    preconditioning_window_hours=control_config['preconditioning_window_hours'],\n"
        ")\n\n"
        "# Merge all features\n"
        "df_heating_final = pd.concat([df_room_heating, df_dev_heating, df_evt_heating], axis=1)\n"
        "df_cooling_final = pd.concat([df_room_cooling, df_dev_cooling, df_evt_cooling], axis=1)\n\n"
        "print('Heating Final Data Shape:', df_heating_final.shape)\n"
        "print('Cooling Final Data Shape:', df_cooling_final.shape)"
    ),
    nbf.v4.new_markdown_cell("## 3. Data Quality Summary"),
    nbf.v4.new_code_cell(
        "def print_quality_summary(df_raw, df_final, events, name):\n"
        "    print(f'=== {name.upper()} SEASON ===')\n"
        "    print(f'Raw row count: {len(df_raw)}')\n"
        "    print(f'Final aligned row count (15-min): {len(df_final)}')\n"
        "    print(f'Unique devices: {df_raw[\"device_id\"].nunique()}')\n"
        "    print(f'Event counts: {len(events)}')\n"
        "    print('Missing value statistics in critical fields:')\n"
        "    critical_cols = [\n"
        "        'room_temp', 'room_return_temp', 'room_humidity', 'room_co2',\n"
        "        'room_power_kw', 'outside_temperature', 'event_active'\n"
        "    ]\n"
        "    for col in critical_cols:\n"
        "        missing = df_final[col].isna().sum()\n"
        "        print(f'  {col}: {missing} missing ({missing / len(df_final) * 100:.2f}%)')\n"
        "    print()\n\n"
        "print_quality_summary(df_heating_raw, df_heating_final, events_heating, 'heating')\n"
        "print_quality_summary(df_cooling_raw, df_cooling_final, events_cooling, 'cooling')"
    ),
]

nb['cells'] = cells

with open('backend/notebooks/07_event_based_device_control.ipynb', 'w') as f:
    nbf.write(nb, f)

print("Notebook created successfully.")
