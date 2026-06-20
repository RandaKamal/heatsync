@M001-992333 @S03 @R003 @notebooks @machine-learning @lstm
Feature: S03 Machine Learning and Two Level Models
  Covers R003: Train LSTMs for base prediction (L1) and correct residuals using
  weather and occupancy variables (L2).

  The machine-learning notebook must demonstrate a two-level prediction path:
  first a base sequence model, then a residual corrector that uses exogenous
  context to improve the forecast.

  Background:
    Given normalized 15-minute HeatSync data is available from S01

  Scenario: Train an LSTM base predictor and residual corrector
    When the machine-learning notebook trains the level-one LSTM predictor
    And it trains the level-two residual correction model with weather and occupancy variables
    Then the notebook produces corrected indoor temperature predictions
    And it reports validation metrics for both the base and corrected predictions
    And the corrected prediction output preserves timestamps and room identifiers

  Scenario: Keep model training reproducible for regression checks
    Given the same normalized training dataset and configured random seed
    When the machine-learning notebook is executed twice
    Then the reported validation metrics remain within the accepted deterministic tolerance
