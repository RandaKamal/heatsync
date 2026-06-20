@M001-992333 @S05 @R005 @notebooks @anomaly-detection
Feature: S05 Anomaly Detection Models
  Covers R005: Implement Isolation Forest, One-Class SVM, and PyTorch
  autoencoder models to identify sensor faults and alarms.

  The anomaly-detection notebook must flag suspicious sensor behavior and
  Modbus alarm registers while preserving enough context for diagnosis.

  Background:
    Given normalized 15-minute HeatSync data is available from S01

  Scenario: Detect sensor anomalies with multiple model families
    When the anomaly-detection notebook evaluates Isolation Forest, One-Class SVM, and autoencoder detectors
    Then it outputs anomaly labels or scores for each evaluated timestamp
    And it identifies sensor readings that deviate from learned normal behavior
    And it reports detector-level summary metrics or counts

  Scenario: Surface Modbus alarm registers as diagnostic anomalies
    Given the input data contains Modbus alarm register values
    When the anomaly-detection notebook builds its anomaly report
    Then Modbus alarm events are included in the flagged anomaly output
    And each alarm flag includes the timestamp and source register context
