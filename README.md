# HeatSync

**Smart heat pump regulation for energy-efficient buildings.**

HeatSync is a smart building energy system developed as part of **TUM Science Hack**. It automatically regulates heat pumps to keep rooms comfortable while reducing energy consumption, costs, and CO₂ emissions.

The system uses room data, occupancy, humidity, weather conditions, and optimization recommendations to decide how heating and cooling should be adjusted. It also detects HVAC-related issues early and supports fault reporting between users and maintenance operators.

---

## Problem

Many buildings waste energy because they:

* Heat or cool underutilized rooms
* Operate HVAC systems inefficiently
* Detect maintenance issues too late
* Lack visibility into energy-saving opportunities

---

## Solution

HeatSync helps buildings use energy more intelligently by:

* Monitoring room conditions in real time
* Automatically adjusting heat pump behavior
* Detecting possible HVAC-related faults
* Suggesting better room usage
* Showing cost savings and CO₂ avoidance
* Connecting users with maintenance support

---

## Main Views

### User View

The User View is designed for building occupants.

Users can:

* See the current room temperature
* See humidity levels
* Check whether the room is within the comfort range
* Understand why a room may feel too warm or too cold
* Use manual or automatic control mode
* View optimization suggestions
* See estimated cost savings
* See estimated CO₂ avoidance
* Report detected issues to maintenance
* Track the status of maintenance requests

### LB Energy View

The LB Energy View is designed for energy managers and operators.

Operators can:

* Monitor room temperature trends over time
* Compare current temperature with the target comfort range
* Detect threshold violations
* Review optimization recommendations
* Identify rooms with unnecessary heating or cooling
* View energy-saving potential
* Manage maintenance requests

---

## Core Features

### Room Monitoring

HeatSync tracks important room conditions:

* Current temperature
* Humidity
* Occupancy
* Comfort status
* Room condition explanation

### Automatic Heat Pump Regulation

The system adjusts heating and cooling based on:

* Target temperature
* Allowed temperature threshold
* Room usage
* Humidity
* Weather conditions
* Optimization recommendations

### Optimization Suggestions

HeatSync recommends actions such as:

* Moving activities to better-suited rooms
* Combining room usage
* Using already conditioned spaces
* Avoiding heating or cooling empty rooms

### Fault Detection

HeatSync can detect possible HVAC-related problems, such as:

* Room temperature outside the allowed range
* Heat pump not reaching the target temperature
* Unusual temperature behavior
* Maintenance-relevant system issues

### Fault Reporting

When an issue is detected:

* The user receives a notification
* The user can contact maintenance through the interface
* Maintenance can approve the request
* The user is notified that the issue will be handled
* The request status can be tracked

### Maintenance Management

Operators can:

* Review incoming requests
* Approve maintenance requests
* Mark requests as in progress
* Resolve requests
* Notify users about the status

---

## Goal

HeatSync aims to make building heating and cooling more efficient, transparent, and user-friendly.

The goal is to reduce unnecessary energy consumption while keeping rooms comfortable and helping operators react faster to technical issues.
