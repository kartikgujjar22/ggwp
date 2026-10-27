import logging
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query

from backend.app.services.data_service import data_service
from backend.app.services.procurement_service import procurement_service
from backend.app.models.schemas import (
    DayDataResponse,
    MonthlySummaryResponse,
    DaySummaryItem,
    ProcurementSimulationRequest,
    ProcurementSimulationResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()

@router.get("/health", tags=["System"])
async def health_check():
    """Returns system status and cached dataset metadata."""
    data_service.load_cache()
    return {
        "status": "healthy",
        "service": "UK Wind Power Forecasting & Procurement Engine",
        "version": "1.0.0",
        "target_period": "January 2026",
        "total_actuals_cached": len(data_service.df_actuals) if data_service.df_actuals is not None else 0,
        "total_forecasts_cached": len(data_service.df_forecasts) if data_service.df_forecasts is not None else 0,
    }

@router.get("/days", response_model=List[DaySummaryItem], tags=["Trading"])
async def list_available_days(
    cutoff_hour: int = Query(11, ge=0, le=23, description="D-1 Gate closure cutoff hour GMT"),
    cutoff_minute: int = Query(0, ge=0, le=59, description="D-1 Gate closure cutoff minute GMT"),
):
    """
    Returns summary metrics for all 31 delivery days in January 2026.
    Allows frontend calendar heatmaps to highlight high-volatility vs calm days.
    """
    try:
        monthly = data_service.get_monthly_summary(cutoff_hour=cutoff_hour, cutoff_minute=cutoff_minute)
        return monthly.days
    except Exception as e:
        logger.error(f"Error fetching days list: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/day/{delivery_date}", response_model=DayDataResponse, tags=["Trading"])
async def get_day_breakdown(
    delivery_date: str,
    cutoff_hour: int = Query(11, ge=0, le=23, description="D-1 Decision Gate Cutoff Hour GMT"),
    cutoff_minute: int = Query(0, ge=0, le=59, description="D-1 Decision Gate Cutoff Minute GMT"),
):
    """
    Returns the complete 48 Settlement Period breakdown for a specific delivery date.
    Pairs actual generation with the latest forecast available prior to D-1 gate closure.
    """
    try:
        return data_service.get_aligned_day_data(
            delivery_date=delivery_date,
            cutoff_hour=cutoff_hour,
            cutoff_minute=cutoff_minute,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))
    except Exception as e:
        logger.error(f"Error fetching day breakdown for {delivery_date}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/monthly-summary", response_model=MonthlySummaryResponse, tags=["Analytics"])
async def get_monthly_metrics(
    cutoff_hour: int = Query(11, ge=0, le=23, description="D-1 Decision Gate Cutoff Hour GMT"),
    cutoff_minute: int = Query(0, ge=0, le=59, description="D-1 Decision Gate Cutoff Minute GMT"),
):
    """
    Returns macro January 2026 metrics: Overall MAE, RMSE, MAPE, Bias,
    48-period hourly profile (identifying peak-hour risk), and error distribution histogram.
    """
    try:
        return data_service.get_monthly_summary(cutoff_hour=cutoff_hour, cutoff_minute=cutoff_minute)
    except Exception as e:
        logger.error(f"Error computing monthly summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/procurement/simulate", response_model=ProcurementSimulationResponse, tags=["Decision Support"])
async def simulate_procurement(req: ProcurementSimulationRequest):
    """
    Decision Support Simulator:
    Evaluates naive procurement vs risk-buffered procurement,
    quantifying thermal procurement recommendations and estimated imbalance cost savings.
    """
    try:
        return procurement_service.simulate_procurement_strategy(req)
    except Exception as e:
        logger.error(f"Error simulating procurement: {e}")
        raise HTTPException(status_code=500, detail=str(e))
