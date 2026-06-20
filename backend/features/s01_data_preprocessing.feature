@M001-992333 @S01 @R001 @notebooks @data-preprocessing
Feature: S01 Data Preprocessing and Shared Utilities
  Covers R001: Load CSV datasets, align to a 15-minute clock, impute missing
  values, and engineer time, weather, and envelope features.

  The shared utilities must turn raw HeatSync data into a normalized modeling
  frame that all downstream notebooks can consume without repeating cleanup
  logic.

  Scenario: Normalize raw CSV data for downstream modeling
    Given raw HeatSync CSV datasets are available
    When the preprocessing utilities load the datasets
    Then every record is aligned to a 15-minute timestamp grid
    And missing numeric values are imputed using deterministic rules
    And engineered time, weather, and envelope features are present
    And the normalized dataframe is ready for forecasting, physics, anomaly, and control notebooks

  Scenario: Preserve data quality diagnostics during preprocessing
    Given raw HeatSync CSV datasets contain gaps or irregular timestamps
    When the preprocessing utilities normalize the datasets
    Then the output includes diagnostics for imputed values and resampled intervals
    And the diagnostics identify any source columns that could not be safely normalized
