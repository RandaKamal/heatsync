import json

with open("backend/notebooks/01_preprocessing.ipynb") as f:
    nb = json.load(f)

# Let's inspect the cells that ruff complains about:
# 1. cell 3 has:
# sys.path.append(os.path.abspath('..'))
# sys.path.append(os.path.abspath('.'))
# sys.path.append(os.path.abspath('backend'))
# Wait, why was there F401 or I001?
# Let's organize imports in cell 3:
# We should sort the imports and group them correctly.
#
# 2. cell 7 has:
# print("=== Missing Value Counts per Column ===")
# for name, df in [('Snapshots', snapshots_raw), ('Intervals', intervals_raw), ('Power Draw', power_raw), ('Space Events', events_raw)]:
# Let's wrap that list of tuples:
#
# 3. cell 9 has:
# import pprint
# inside the cell, not at the top. Let's move 'import pprint' to the top of cell 9, or import it in cell 3.
#
# 4. cell 13 has:
# axes[0].plot(dev_raw_snap.index, dev_raw_snap['status_temperature_outside_in_celsius'], 'o', color='blue', label='Raw Temp Outside', alpha=0.6)
# and other long lines.
#
# 5. cell 15 has:
# heating_final.reset_index().to_csv(PROJECT_ROOT / 'backend/data/processed/processed_heating.csv', index=False)
# cooling_final.reset_index().to_csv(PROJECT_ROOT / 'backend/data/processed/processed_cooling.csv', index=False)

# Let's edit cell 3 to have clean imports:
nb["cells"][3]["source"] = [
    "import os\n",
    "import sys\n",
    "\n",
    "# Adjust paths so we can import our notebooks.utils package\n",
    "sys.path.append(os.path.abspath(\"..\"))\n",
    "sys.path.append(os.path.abspath(\".\"))\n",
    "sys.path.append(os.path.abspath(\"backend\"))\n",
    "\n",
    "import pandas as pd\n",
    "\n",
    "from notebooks.utils import (\n",
    "    PROJECT_ROOT,\n",
    "    build_aligned_dataset,\n",
    "    load_intervals,\n",
    "    load_power_draw,\n",
    "    load_snapshots,\n",
    "    load_space_events,\n",
    "    save_processed,\n",
    ")\n",
    "\n",
    "# Load raw datasets \n",
    "snapshots_raw = load_snapshots(\"heating\")\n",
    "intervals_raw = load_intervals(\"heating\")\n",
    "power_raw = load_power_draw(\"heating\")\n",
    "events_raw = load_space_events(\"heating\")\n"
]

# Let's edit cell 7:
nb["cells"][7]["source"] = [
    "print(\"=== Missing Value Counts per Column ===\")\n",
    "datasets = [\n",
    "    (\"Snapshots\", snapshots_raw),\n",
    "    (\"Intervals\", intervals_raw),\n",
    "    (\"Power Draw\", power_raw),\n",
    "    (\"Space Events\", events_raw),\n",
    "]\n",
    "for name, df in datasets:\n",
    "    print(f\"\\n{name}:\")\n",
    "    missing = df.isna().sum()\n",
    "    print(missing[missing > 0] if missing.sum() > 0 else \"No missing values\")\n",
    "\n",
    "print(\"\\n=== Duplicate Timestamp Check (per device) ===\")\n",
    "snap_dups = (\n",
    "    snapshots_raw.reset_index()\n",
    "    .duplicated(subset=[\"device_id\", \"last_seen_at\"])\n",
    "    .sum()\n",
    ")\n",
    "int_dups = (\n",
    "    intervals_raw.reset_index()\n",
    "    .duplicated(subset=[\"device_id\", \"interval_start_time\"])\n",
    "    .sum()\n",
    ")\n",
    "pwr_dups = power_raw.duplicated(subset=[\"device_id\", \"timestamp\"]).sum()\n",
    "print(f\"Snapshots duplicate keys: {snap_dups}\")\n",
    "print(f\"Intervals duplicate keys: {int_dups}\")\n",
    "print(f\"Power Draw duplicate keys: {pwr_dups}\")\n"
]

# Let's edit cell 9:
nb["cells"][9]["source"] = [
    "import pprint\n",
    "\n",
    "aligned_heating, quality_report = build_aligned_dataset(\"heating\")\n",
    "print(\"Aligned dataset shape:\", aligned_heating.shape)\n",
    "print(f\"Before resampling (snapshots count): {len(snapshots_raw)}\")\n",
    "print(f\"After resampling (aligned count): {len(aligned_heating)}\")\n",
    "\n",
    "print(\"\\nQuality Report:\")\n",
    "pprint.pprint(quality_report)\n"
]

# Let's edit cell 13:
nb["cells"][13]["source"] = [
    "%matplotlib inline\n",
    "import matplotlib.pyplot as plt\n",
    "\n",
    "# Get the first device ID\n",
    "device_id = aligned_heating[\"device_id\"].dropna().unique()[0]\n",
    "dev_raw_snap = snapshots_raw[snapshots_raw[\"device_id\"] == device_id]\n",
    "dev_aligned = aligned_heating[aligned_heating[\"device_id\"] == device_id]\n",
    "\n",
    "fig, axes = plt.subplots(3, 1, figsize=(14, 10), sharex=True)\n",
    "\n",
    "# Subplot 1: Temperature comparison\n",
    "axes[0].plot(\n",
    "    dev_raw_snap.index,\n",
    "    dev_raw_snap[\"status_temperature_outside_in_celsius\"],\n",
    "    \"o\",\n",
    "    color=\"blue\",\n",
    "    label=\"Raw Temp Outside\",\n",
    "    alpha=0.6,\n",
    ")\n",
    "axes[0].plot(\n",
    "    dev_aligned.index,\n",
    "    dev_aligned[\"outside_temperature\"],\n",
    "    \"-\",\n",
    "    color=\"cyan\",\n",
    "    label=\"Aligned Temp Outside\",\n",
    "    alpha=0.8,\n",
    ")\n",
    "axes[0].set_title(f\"Outside Temperature: Raw vs Aligned (Device: {device_id})\")\n",
    "axes[0].legend()\n",
    "axes[0].grid(True)\n",
    "\n",
    "# Subplot 2: Power Draw\n",
    "axes[1].plot(\n",
    "    dev_aligned.index,\n",
    "    dev_aligned[\"power_draw_kw\"],\n",
    "    \"-\",\n",
    "    color=\"orange\",\n",
    "    label=\"Power Draw (kW)\",\n",
    ")\n",
    "axes[1].set_title(f\"Power Draw (Device: {device_id})\")\n",
    "axes[1].legend()\n",
    "axes[1].grid(True)\n",
    "\n",
    "# Subplot 3: Occupancy Flag\n",
    "axes[2].fill_between(\n",
    "    dev_aligned.index,\n",
    "    dev_aligned[\"occupancy_flag\"],\n",
    "    color=\"green\",\n",
    "    alpha=0.3,\n",
    "    label=\"Occupancy Active\",\n",
    ")\n",
    "axes[2].set_title(\"Occupancy Schedule Flag\")\n",
    "axes[2].legend()\n",
    "axes[2].grid(True)\n",
    "\n",
    "plt.xlabel(\"Timestamp\")\n",
    "plt.tight_layout()\n",
    "plt.show()\n"
]

# Let's edit cell 15:
nb["cells"][15]["source"] = [
    "# Run for heating\n",
    "heating_final, heating_report = build_aligned_dataset(\"heating\")\n",
    "save_processed(heating_final, \"heating\")\n",
    "heating_path = PROJECT_ROOT / \"backend/data/processed/processed_heating.csv\"\n",
    "heating_final.reset_index().to_csv(heating_path, index=False)\n",
    "\n",
    "# Run for cooling\n",
    "cooling_final, cooling_report = build_aligned_dataset(\"cooling\")\n",
    "save_processed(cooling_final, \"cooling\")\n",
    "cooling_path = PROJECT_ROOT / \"backend/data/processed/processed_cooling.csv\"\n",
    "cooling_final.reset_index().to_csv(cooling_path, index=False)\n",
    "\n",
    "print(\"Heating final dataset shape:\", heating_final.shape)\n",
    "print(\"Cooling final dataset shape:\", cooling_final.shape)\n",
    "print(\"\\nProcessed column list:\")\n",
    "print(list(heating_final.columns))\n"
]

with open("backend/notebooks/01_preprocessing.ipynb", "w") as f:
    json.dump(nb, f, indent=1)
print("Done!")
