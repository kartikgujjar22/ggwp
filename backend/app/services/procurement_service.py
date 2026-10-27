import logging
from typing import List, Dict, Any
import numpy as np

from backend.app.core.config import settings
from backend.app.services.data_service import data_service
from backend.app.models.schemas import (
    ProcurementSimulationRequest,
    ProcurementSimulationResponse,
    ProcurementPeriodRecord,
)

logger = logging.getLogger(__name__)

class ProcurementService:
    @staticmethod
    def _get_uk_demand_profile(base_demand_mw: float) -> np.ndarray:
        """
        Synthesizes a realistic UK winter daily demand curve across 48 Settlement Periods.
        Features overnight lull (~70% of base), morning ramp (~105%), afternoon plateau (~95%),
        and evening dinner/heating peak (~125% at SP 35-38).
        """
        # Multipliers for 48 half-hour settlement periods
        multipliers = [
            0.72, 0.70, 0.68, 0.67, 0.66, 0.65, 0.65, 0.67,  # SP 1-8: 00:00 - 04:00 (Night trough)
            0.70, 0.75, 0.82, 0.90, 0.98, 1.05, 1.08, 1.07,  # SP 9-16: 04:00 - 08:00 (Morning ramp)
            1.05, 1.03, 1.02, 1.00, 0.98, 0.97, 0.96, 0.96,  # SP 17-24: 08:00 - 12:00 (Midday)
            0.95, 0.95, 0.96, 0.98, 1.00, 1.04, 1.09, 1.15,  # SP 25-32: 12:00 - 16:00 (Afternoon ramp)
            1.22, 1.25, 1.27, 1.26, 1.22, 1.18, 1.12, 1.06,  # SP 33-40: 16:00 - 20:00 (Evening Peak)
            1.00, 0.95, 0.90, 0.86, 0.82, 0.78, 0.75, 0.73   # SP 41-48: 20:00 - 24:00 (Night wind-down)
        ]
        return np.array(multipliers) * base_demand_mw

    def simulate_procurement_strategy(
        self, req: ProcurementSimulationRequest
    ) -> ProcurementSimulationResponse:
        """
        Simulates procurement decisions and compares:
        1. Naive Strategy: Procuring strictly based on raw wind forecast.
        2. Risk-Adjusted Strategy: Factoring in quantified forecast error buffer.
        """
        day_data = data_service.get_aligned_day_data(
            delivery_date=req.delivery_date,
            cutoff_hour=req.cutoff_hour,
            cutoff_minute=req.cutoff_minute,
        )

        demand_curve = self._get_uk_demand_profile(req.base_demand_mw)
        confidence_factor = req.confidence_buffer  # e.g., 0.90 -> P90 buffer

        # Daily MAE informs the standard error buffer scale
        daily_mae = max(day_data.metrics.mae, 500.0)
        # Normal quantile for confidence buffer (e.g., 1.28 for 90%, 0.67 for 75%)
        z_score = 1.28 if confidence_factor >= 0.85 else (0.67 if confidence_factor >= 0.65 else 0.0)
        buffer_mw_standard = z_score * daily_mae

        periods: List[ProcurementPeriodRecord] = []
        tot_unhedged_penalties = 0.0
        tot_hedged_penalties = 0.0
        tot_unadj_procured_mwh = 0.0
        tot_risk_procured_mwh = 0.0

        for i, p in enumerate(day_data.periods):
            demand = float(demand_curve[i])
            fc_wind = float(p.forecast_generation_mw)
            act_wind = float(p.actual_generation_mw)

            # Safety buffer is higher during peak hours (SP 33-40) due to higher grid stress
            is_peak = (33 <= p.settlement_period <= 40)
            peak_multiplier = 1.25 if is_peak else 1.0
            buffer_mw = buffer_mw_standard * peak_multiplier

            # Strategy 1: Unadjusted Day-Ahead procurement
            unadj_thermal = max(0.0, demand - fc_wind)
            # Real-time imbalance: Short if demand > (thermal + actual wind)
            real_time_supply_unadj = unadj_thermal + act_wind
            unhedged_imbalance = demand - real_time_supply_unadj  # Positive = Short

            # Strategy 2: Risk-adjusted Day-Ahead procurement (assume conservative wind availability)
            hedged_wind_expected = max(0.0, fc_wind - buffer_mw)
            risk_adj_thermal = max(0.0, demand - hedged_wind_expected)
            real_time_supply_hedged = risk_adj_thermal + act_wind
            hedged_imbalance = demand - real_time_supply_hedged

            # Costs (half-hour MWh = MW * 0.5)
            # If short in real time: pay cashout penalty price
            cost_unhedged = max(0.0, unhedged_imbalance) * 0.5 * req.imbalance_penalty_price
            cost_hedged = max(0.0, hedged_imbalance) * 0.5 * req.imbalance_penalty_price

            tot_unhedged_penalties += cost_unhedged
            tot_hedged_penalties += cost_hedged
            tot_unadj_procured_mwh += unadj_thermal * 0.5
            tot_risk_procured_mwh += risk_adj_thermal * 0.5

            periods.append(
                ProcurementPeriodRecord(
                    settlement_period=p.settlement_period,
                    time_label=p.time_label,
                    customer_demand_mw=round(demand, 1),
                    forecast_wind_mw=round(fc_wind, 1),
                    actual_wind_mw=round(act_wind, 1),
                    safety_buffer_mw=round(buffer_mw, 1),
                    unadjusted_thermal_procurement_mw=round(unadj_thermal, 1),
                    risk_adjusted_thermal_procurement_mw=round(risk_adj_thermal, 1),
                    unhedged_imbalance_mw=round(unhedged_imbalance, 1),
                    hedged_imbalance_mw=round(hedged_imbalance, 1),
                    estimated_imbalance_cost_unhedged=round(cost_unhedged, 2),
                    estimated_imbalance_cost_hedged=round(cost_hedged, 2),
                )
            )

        net_savings = max(0.0, tot_unhedged_penalties - tot_hedged_penalties)

        return ProcurementSimulationResponse(
            delivery_date=req.delivery_date,
            confidence_buffer=confidence_factor,
            total_customer_demand_mwh=round(float(demand_curve.sum() * 0.5), 1),
            total_forecast_wind_mwh=day_data.metrics.total_forecast_mwh,
            total_actual_wind_mwh=day_data.metrics.total_actual_mwh,
            total_unadjusted_thermal_procured_mwh=round(tot_unadj_procured_mwh, 1),
            total_risk_adjusted_thermal_procured_mwh=round(tot_risk_procured_mwh, 1),
            total_unhedged_penalty_cost=round(tot_unhedged_penalties, 2),
            total_hedged_penalty_cost=round(tot_hedged_penalties, 2),
            net_risk_savings_gbp=round(net_savings, 2),
            periods=periods,
        )

procurement_service = ProcurementService()
