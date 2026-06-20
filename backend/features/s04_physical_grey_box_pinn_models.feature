@M001-992333 @S04 @R004 @notebooks @physics @grey-box @pinn
Feature: S04 Physical Grey Box and PINN Models
  Covers R004: Calibrate a 2R2C grey-box model and construct a Physics-Informed
  Neural Network (PINN) in PyTorch.

  The physical-modeling notebook must connect data-driven fitting with thermal
  physics so outputs remain plausible and reusable by control analysis.

  Background:
    Given normalized 15-minute HeatSync data is available from S01

  Scenario: Calibrate a 2R2C grey-box thermal model
    When the physical-modeling notebook calibrates the 2R2C model
    Then it estimates thermal resistance and capacitance parameters
    And it reports calibration error metrics
    And the calibrated model can simulate indoor temperature response over time

  Scenario: Optimize a PINN with physics-consistency loss
    When the physical-modeling notebook trains the PINN model
    Then the loss includes both data fit and physics-consistency terms
    And the notebook reports the final data and physics loss values
    And the resulting predictions respect the expected thermal response direction
