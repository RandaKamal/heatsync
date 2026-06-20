@M001-992333 @S07 @R007 @notebooks @integration
Feature: S07 Automated Notebook Suite Integration
  Covers R007: Develop a Python script to run all notebooks end-to-end and
  ensure zero exceptions.

  The integration runner must prove the full notebook suite works together after
  each individual modeling slice is available.

  Background:
    Given all HeatSync modeling notebooks are present under backend/notebooks
    And the backend development environment is synchronized from the frozen lock file

  Scenario: Execute the complete notebook suite without exceptions
    When the notebook integration runner executes every planned notebook
    Then each notebook completes with zero uncaught exceptions
    And the runner records pass or fail status for each notebook
    And generated outputs include forecasting metrics, anomaly results, and control savings summaries

  Scenario: Report the failing notebook when suite execution breaks
    Given one notebook raises an exception during execution
    When the notebook integration runner executes the suite
    Then the runner exits with a non-zero status
    And the failure report names the notebook, execution phase, and exception summary
