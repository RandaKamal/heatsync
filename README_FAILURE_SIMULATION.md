# HeatSync Early-Warning Simulation

This branch adds an automated failure-detection demonstration to the HeatSync 3D building climate-control dashboard.

## Branch

`feat/early-warning-simulation`

## Purpose

The branch demonstrates how HeatSync:

1. controls building temperature using weather, occupancy and scheduled events;
2. avoids false alarms caused by short disturbances;
3. detects persistent equipment underperformance;
4. explains the evidence behind an alert;
5. recommends a realistic technician action;
6. activates a safe mitigation strategy;
7. verifies recovery after the simulated repair.

The demo is designed for the hackathon presentation and video submission.

---

## Main features

### 1. Automated 60-second scenario

The simulation starts when the user presses **Run demo**.

It supports:

* Play
* Pause
* Resume
* Restart
* Reset
* 1×, 2× and 4× playback speed

### 2. Normal operation

At the beginning, HeatSync uses:

* room temperatures;
* target temperatures;
* outdoor weather;
* expected solar gain;
* lecture schedules;
* current and expected occupancy;
* equipment capacity;
* energy consumption.

The system regulates heating and ventilation while keeping rooms comfortable and reducing unnecessary energy use.

### 3. Occupancy-aware regulation

When students enter lecture hall G01:

* internal heat gains increase;
* compressor demand decreases;
* fresh-air ventilation increases;
* energy consumption stays below the fixed-schedule baseline.

### 4. False-alert prevention

The simulation introduces a short temperature drop in G01.

HeatSync identifies it as a temporary door-opening disturbance because:

* the temperature recovers quickly;
* the disturbance lasts for only one validation window;
* airflow and power behaviour remain normal.

No equipment-failure alert is created.

### 5. Simulated equipment failure

ORION-02 develops an airflow restriction.

The scenario simulates:

* high electrical input;
* falling supply airflow;
* increasing fan speed;
* decreasing COP;
* slow room-temperature response;
* increasing thermal-model residual;
* declining equipment-health score.

The affected room is G03.

### 6. Persistence-based detection

HeatSync does not declare a failure after one abnormal value.

It waits until the deviation persists across several validation windows and checks whether it can be explained by:

* weather;
* occupancy;
* lecture scheduling;
* door-opening disturbances;
* sensor behaviour.

### 7. Explainable early warning

The app displays:

* likely fault type;
* detection confidence;
* affected device;
* affected room;
* expected room-readiness delay;
* observed versus expected airflow;
* observed versus expected warming rate;
* thermal-model residual;
* current electrical input.

The likely problem is described as a clogged return-air filter or restricted flexible duct.

### 8. Recommended action

HeatSync recommends:

> Inspect and replace the return-air filter, then verify the flexible ducts and delivered airflow.

The app does not claim that software can physically repair the equipment.

### 9. Safe mitigation

While waiting for technician intervention, HeatSync:

* extends the room’s preconditioning window;
* prevents repeated aggressive power escalation;
* keeps the unit in supervised operation;
* records the incident and all control decisions.

### 10. Recovery verification

After the simulated filter correction:

* airflow increases;
* COP improves;
* room warming returns to the expected range;
* predicted delay decreases;
* equipment health recovers.

HeatSync waits for multiple normal validation windows before marking the incident as resolved.

---

## Simulation timeline

| Simulation time | Phase                                          |
| --------------- | ---------------------------------------------- |
| 0–8 seconds     | Normal weather- and schedule-aware control     |
| 8–16 seconds    | Occupancy-adaptive regulation                  |
| 16–22 seconds   | Short door disturbance correctly ignored       |
| 22–31 seconds   | ORION-02 airflow restriction develops          |
| 31–38 seconds   | Persistence and residual validation            |
| 38–44 seconds   | Explainable early warning                      |
| 44–50 seconds   | Safe mitigation                                |
| 50–58 seconds   | Simulated technician intervention and recovery |
| 58–60 seconds   | Incident resolved                              |

At 2× speed, the demo lasts approximately 30 seconds.

At 4× speed, it lasts approximately 15 seconds.

---

## Important files

### Simulation scenario

`src/simulation/failureScenario.ts`

Contains:

* phase timing;
* room-temperature changes;
* occupancy changes;
* airflow failure;
* COP and power changes;
* confidence values;
* detection evidence;
* warnings;
* mitigation;
* recovery.

### Simulation types

`src/simulation/types.ts`

Contains the TypeScript definitions for:

* simulation phases;
* evidence;
* incident severity;
* simulation log entries;
* simulation frames.

### Timer and playback controls

`src/hooks/useFailureSimulation.ts`

Controls:

* elapsed simulation time;
* Play;
* Pause;
* Resume;
* Restart;
* Reset;
* playback speed.

### Simulation interface

`src/components/ui/FailureSimulationPanel.tsx`

Displays:

* playback controls;
* progress bar;
* current scenario phase;
* confidence;
* predicted delay;
* fault evidence;
* recommended action;
* mitigation;
* incident timeline.

### Application integration

`src/App.tsx`

Connects the simulation to:

* the 3D building;
* room states;
* device states;
* automatic device selection;
* the right analytics sidebar;
* energy graphs;
* control decisions.

### Styling

`src/styles.css`

Contains the simulation-panel styling under:

`HeatSync failure simulation update`

---

## Running the project

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev -- --open
```

Create a production build:

```bash
npm run build
```

---

## Running the demo

1. Open HeatSync in the browser.
2. Find the **Early-warning failure detection** panel.
3. Choose 1×, 2× or 4× speed.
4. Press **Run demo**.
5. Let the scenario run automatically.

The app automatically focuses on the relevant device when the abnormal event begins.

---

## Technologies

* React
* TypeScript
* Vite
* Three.js
* React Three Fiber
* Drei
* Recharts

---

## Data status

The current prototype uses simulated or replayed data.

Simulated values include:

* room temperatures;
* occupancy;
* weather;
* device power;
* airflow;
* COP;
* energy consumption;
* fault evidence;
* control decisions;
* technician intervention.

The Orion model specifications are represented separately from current operating telemetry.

The prototype must not be presented as having validated real-world fault-detection accuracy or verified production energy savings.

---

## Current limitations

* No real IHL or Orion telemetry API is connected.
* No physical equipment is controlled.
* The technician repair is simulated.
* Fault thresholds are demonstration thresholds.
* Only one main equipment-failure scenario is implemented.
* Energy savings are model-estimated rather than directly measured.
* The scenario is deterministic so the presentation remains reliable.

---

## Suggested next steps

1. Connect real telemetry through an API or CSV replay adapter.
2. Replace fixed thresholds with learned normal-response ranges.
3. Add sensor-drift and communication-failure scenarios.
4. Add alert acknowledgement and technician notes.
5. Store incident history in a backend database.
6. Compare predicted faults with maintenance records.
7. Validate detection thresholds on real building data.
8. Add a shadow mode before enabling any real control actions.

---

## Notes for merging

This branch modifies:

* `src/App.tsx`
* `src/styles.css`

It adds:

* `src/simulation/`
* `src/hooks/useFailureSimulation.ts`
* `src/components/ui/FailureSimulationPanel.tsx`
* `README_FAILURE_SIMULATION.md`

Check these files carefully if other branches also modify the application layout or global styles.
