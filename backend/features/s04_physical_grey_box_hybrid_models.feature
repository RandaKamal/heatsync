@M001-992333 @S04 @R004 @notebooks @physics @grey-box @hybrid @residual
Feature: S04 Physical Grey Box and Residual Hybrid Models
  Covers R004: Calibrate a 2R2C grey-box model and construct a neural residual
  corrector in PyTorch.

  The physical-modeling notebook must connect data-driven fitting with thermal
  physics so outputs remain plausible and reusable by control analysis.

  Background:
    Given normalized 15-minute HeatSync data is available from S01

  Scenario: Calibrate a 2R2C grey-box thermal model
    When the physical-modeling notebook calibrates the 2R2C model
    Then it estimates thermal resistance and capacitance parameters
    And it reports calibration error metrics
    And the calibrated model can simulate indoor temperature response over time

  Scenario: Train a physical-first residual hybrid model
    When the physical-modeling notebook trains the residual corrector
    Then the 2R2C grey-box prediction is the level-one baseline
    And the residual corrector uses stateful and electrical-energy features
    And the notebook reports 2R2C and hybrid error metrics
