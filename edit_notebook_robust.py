import json

with open("backend/notebooks/01_preprocessing.ipynb") as f:
    nb = json.load(f)

# Find cells by content
for idx, cell in enumerate(nb["cells"]):
    if cell["cell_type"] != "code":
        continue
    src = "".join(cell["source"])
    
    # 1. Imports cell
    if "import sys" in src and "notebooks.utils" in src:
        print(f"Found imports cell at index {idx}")
        cell["source"] = [
            "import os\n",
            "import sys\n",
            "\n",
            "# Adjust paths so we can import our notebooks.utils package\n",
            "sys.path.append(os.path.abspath(\"..\"))\n",
            "sys.path.append(os.path.abspath(\".\"))\n",
            "sys.path.append(os.path.abspath(\"backend\"))\n",
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
            "# Load raw datasets for the heating window\n",
            "snapshots_raw = load_snapshots(\"heating\")\n",
            "intervals_raw = load_intervals(\"heating\")\n",
            "power_raw = load_power_draw(\"heating\")\n",
            "events_raw = load_space_events(\"heating\")\n"
        ]

    # 2. Missing value counts cell
    elif "Missing Value Counts" in src and "for name, df in" in src:
        print(f"Found Missing Value Counts cell at index {idx}")
        cell["source"] = [
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

    # 3. Quality Report cell
    elif "pprint.pprint(quality_report)" in src:
        print(f"Found Quality Report cell at index {idx}")
        cell["source"] = [
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

    # 4. Matplotlib plot cell
    elif "axes[0].plot" in src and "matplotlib" in src:
        print(f"Found Matplotlib cell at index {idx}")
        cell["source"] = [
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
            "axes[0].set_title(f\"Outside Temp: Raw vs Aligned (Device: {device_id})\")\n",
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

    # 5. Process both windows cell
    elif "heating_final" in src and "save_processed" in src and "cooling_final" in src:
        print(f"Found process both windows cell at index {idx}")
        cell["source"] = [
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
print("Notebook modification done!")
