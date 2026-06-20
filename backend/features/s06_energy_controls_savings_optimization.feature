@M001-992333 @S06 @R006 @notebooks @controls @energy-savings
Feature: S06 Energy Controls and Savings Optimization
  Covers R006: Estimate heating and cooling power draw, calculate occupancy
  sensible and latent heat gains, and evaluate setpoint setbacks.

  The controls notebook must translate thermal model outputs into practical
  control scenarios and quantified energy-saving estimates.

  Background:
    Given normalized 15-minute HeatSync data is available from S01
    And physical model outputs are available from S04

  Scenario: Calculate occupancy heat gains and HVAC power draw
    When the controls notebook evaluates occupancy and HVAC operating data
    Then it estimates sensible and latent occupancy heat gains
    And it estimates heating or cooling power draw over the analysis period
    And the calculated values are reported in physically meaningful units

  Scenario: Compare setpoint setback strategies for savings
    When the controls notebook evaluates setback control scenarios
    Then it reports estimated energy savings in kWh
    And it compares each scenario against the baseline operating strategy
    And it identifies comfort or operating constraints affected by the scenario
