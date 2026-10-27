import os
from pathlib import Path

class Settings:
    PROJECT_NAME: str = "UK Wind Power Day-Ahead Forecasting & Procurement Portal"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Base paths
    BACKEND_DIR: Path = Path(__file__).resolve().parent.parent.parent
    PROJECT_ROOT: Path = BACKEND_DIR.parent
    DATA_DIR: Path = PROJECT_ROOT / "data"
    CACHE_FILE: Path = DATA_DIR / "elexon_jan2026_cache.json"
    
    # Elexon BMRS API Endpoints
    ELEXON_BASE_URL: str = "https://data.elexon.co.uk/bmrs/api/v1"
    ELEXON_FUELHH_URL: str = f"{ELEXON_BASE_URL}/datasets/fuelhh"
    ELEXON_WINDFOR_STREAM_URL: str = f"{ELEXON_BASE_URL}/datasets/windfor/stream"
    
    # UK Electricity Market Constants
    DEFAULT_CUTOFF_HOUR_D_MINUS_1: int = 11  # 11:00 GMT on D-1
    DEFAULT_CUTOFF_MINUTE_D_MINUS_1: int = 0
    TOTAL_SETTLEMENT_PERIODS: int = 48
    SETTLEMENT_PERIOD_MINUTES: int = 30
    TARGET_MONTH: str = "2026-01"
    
    # Balancing Mechanism illustrative cashout penalties (£/MWh)
    AVERAGE_IMBALANCE_SHORT_PRICE: float = 95.0   # Penalty price when under-procured
    AVERAGE_IMBALANCE_LONG_PRICE: float = 40.0    # Discount spill price when over-procured
    DAY_AHEAD_THERMAL_PRICE: float = 75.0         # Baseline day-ahead wholesale purchase price

settings = Settings()
