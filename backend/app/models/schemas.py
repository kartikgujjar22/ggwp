from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class SettlementPeriodRecord(BaseModel):
    settlement_period: int = Field(..., description="Settlement Period (1 to 48)")
    start_time: str = Field(..., description="Target half-hour ISO start timestamp")
    time_label: str = Field(..., description="Human-readable time window e.g. 17:30 - 18:00")
    actual_generation_mw: float = Field(..., description="Actual wind power in MW")
    forecast_generation_mw: float = Field(..., description="Day-ahead forecast in MW")
    forecast_publish_time: str = Field(..., description="ISO timestamp when forecast was published")
    error_mw: float = Field(..., description="Forecast - Actual (MW)")
    abs_error_mw: float = Field(..., description="|Forecast - Actual| (MW)")
    error_percentage: float = Field(..., description="Percentage error relative to actual")
    is_over_forecast: bool = Field(..., description="True if forecast exceeded actual")

class DayMetrics(BaseModel):
    mae: float = Field(..., description="Mean Absolute Error (MW)")
    rmse: float = Field(..., description="Root Mean Square Error (MW)")
    mape: float = Field(..., description="Mean Absolute Percentage Error (%)")
    bias: float = Field(..., description="Mean Error / Bias (MW) (+ is over-prediction)")
    total_actual_mwh: float = Field(..., description="Total actual energy generated in MWh")
    total_forecast_mwh: float = Field(..., description="Total forecast energy in MWh")
    max_error_mw: float = Field(..., description="Worst-case peak error in MW")
    max_error_sp: int = Field(..., description="Settlement Period with largest absolute error")
    over_forecast_count: int = Field(..., description="Number of SPs where wind was over-predicted")
    under_forecast_count: int = Field(..., description="Number of SPs where wind was under-predicted")

class DayDataResponse(BaseModel):
    delivery_date: str
    decision_gate_cutoff: str
    metrics: DayMetrics
    periods: List[SettlementPeriodRecord]

class DaySummaryItem(BaseModel):
    date: str
    mae: float
    rmse: float
    mape: float
    bias: float
    avg_actual_mw: float
    avg_forecast_mw: float
    max_error_mw: float
    max_error_sp: int

class SettlementPeriodProfile(BaseModel):
    settlement_period: int
    time_label: str
    avg_actual_mw: float
    avg_forecast_mw: float
    avg_mae: float
    avg_rmse: float
    avg_bias: float
    is_peak_period: bool

class ErrorDistributionBin(BaseModel):
    bin_range: str
    bin_min: float
    bin_max: float
    count: int
    percentage: float

class MonthlySummaryResponse(BaseModel):
    target_month: str
    total_settlement_periods: int
    decision_gate_cutoff: str
    overall_mae: float
    overall_rmse: float
    overall_mape: float
    overall_bias: float
    total_actual_twh: float
    total_forecast_twh: float
    days: List[DaySummaryItem]
    sp_hourly_profile: List[SettlementPeriodProfile]
    error_distribution: List[ErrorDistributionBin]

class ProcurementSimulationRequest(BaseModel):
    delivery_date: str
    cutoff_hour: int = 11
    cutoff_minute: int = 0
    base_demand_mw: float = 30000.0  # Typical UK winter base demand
    confidence_buffer: float = 0.90   # P90 conservative buffer
    imbalance_penalty_price: float = 95.0

class ProcurementPeriodRecord(BaseModel):
    settlement_period: int
    time_label: str
    customer_demand_mw: float
    forecast_wind_mw: float
    actual_wind_mw: float
    safety_buffer_mw: float
    unadjusted_thermal_procurement_mw: float
    risk_adjusted_thermal_procurement_mw: float
    unhedged_imbalance_mw: float
    hedged_imbalance_mw: float
    estimated_imbalance_cost_unhedged: float
    estimated_imbalance_cost_hedged: float

class ProcurementSimulationResponse(BaseModel):
    delivery_date: str
    confidence_buffer: float
    total_customer_demand_mwh: float
    total_forecast_wind_mwh: float
    total_actual_wind_mwh: float
    total_unadjusted_thermal_procured_mwh: float
    total_risk_adjusted_thermal_procured_mwh: float
    total_unhedged_penalty_cost: float
    total_hedged_penalty_cost: float
    net_risk_savings_gbp: float
    periods: List[ProcurementPeriodRecord]
