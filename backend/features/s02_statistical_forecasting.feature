@M001-992333 @S02 @R002 @notebooks @forecasting @sarimax
Feature: S02 Statistical Temperature Forecasting
  Covers R002: Implement ARIMA/SARIMAX models to forecast indoor room
  temperatures.

  The statistical forecasting notebook must consume the shared normalized data
  and produce interpretable room-temperature forecasts with validation metrics.

  Background:
    Given normalized 15-minute HeatSync data is available from S01

  Scenario: Forecast indoor room temperature with SARIMAX
    When the statistical forecasting notebook fits an ARIMA or SARIMAX model
    Then it produces indoor temperature forecasts for the requested horizon
    And it reports validation metrics including RMSE and MAPE
    And it stores enough model diagnostics to explain forecast quality

  Scenario: Reject forecasting inputs that are not aligned to the shared contract
    Given the modeling data is missing the required 15-minute timestamp alignment
    When the statistical forecasting notebook prepares its training data
    Then it fails with an actionable validation error
    And the error names the missing or invalid input contract
