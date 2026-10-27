import pytest
from fastapi.testclient import TestClient
from backend.app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["total_actuals_cached"] == 1488
    assert data["total_forecasts_cached"] > 0

def test_list_available_days():
    response = client.get("/api/v1/days")
    assert response.status_code == 200
    days = response.json()
    assert len(days) == 31
    assert days[0]["date"] == "2026-01-01"
    assert days[-1]["date"] == "2026-01-31"

def test_day_breakdown_settlement_periods():
    response = client.get("/api/v1/day/2026-01-15?cutoff_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["periods"]) == 48
    
    # Check settlement periods 1 through 48
    assert data["periods"][0]["settlement_period"] == 1
    assert data["periods"][-1]["settlement_period"] == 48
    
    # Check metrics
    metrics = data["metrics"]
    assert metrics["mae"] > 0
    assert metrics["rmse"] >= metrics["mae"]  # Mathematical property: RMSE >= MAE
    assert metrics["total_actual_mwh"] > 0

def test_monthly_summary():
    response = client.get("/api/v1/monthly-summary?cutoff_hour=11")
    assert response.status_code == 200
    data = response.json()
    assert data["total_settlement_periods"] == 1488
    assert data["overall_mae"] > 0
    assert data["overall_rmse"] >= data["overall_mae"]
    assert len(data["sp_hourly_profile"]) == 48
    assert len(data["error_distribution"]) > 0

def test_procurement_simulation():
    payload = {
        "delivery_date": "2026-01-15",
        "cutoff_hour": 11,
        "cutoff_minute": 0,
        "base_demand_mw": 32000.0,
        "confidence_buffer": 0.90,
        "imbalance_penalty_price": 95.0
    }
    response = client.post("/api/v1/procurement/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["delivery_date"] == "2026-01-15"
    assert len(data["periods"]) == 48
    assert data["total_customer_demand_mwh"] > 0
    assert data["total_risk_adjusted_thermal_procured_mwh"] >= data["total_unadjusted_thermal_procured_mwh"]
