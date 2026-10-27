#!/usr/bin/env python3
"""
UK Wind Power Data Ingestion Script (January 2026)
Fetches and caches actuals (FUELHH) and forecasts (WINDFOR) from Elexon BMRS API.
Respects Elexon's 7-day query window constraints and implements retry logic.
"""

import json
import logging
import time
import urllib.request
import urllib.error
from datetime import datetime, timedelta
from pathlib import Path
import sys

# Add project root to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from backend.app.core.config import settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

def fetch_json_with_retries(url: str, max_retries: int = 3, delay: float = 2.0):
    """Fetch JSON with retry logic and standard browser headers to prevent throttling."""
    headers = {
        "Accept": "application/json",
        "User-Agent": "UK-Forecast-Platform/1.0"
    }
    req = urllib.request.Request(url, headers=headers)
    
    for attempt in range(1, max_retries + 1):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
                return data
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError) as e:
            logger.warning(f"Attempt {attempt}/{max_retries} failed for {url}: {e}")
            if attempt < max_retries:
                time.sleep(delay * attempt)
            else:
                logger.error(f"Failed after {max_retries} attempts for {url}")
                raise

def fetch_actuals_january_2026():
    """
    Fetch all 1,488 Settlement Periods of FUELHH WIND actuals for January 2026.
    Uses 7-day chunks to comply with Elexon validation rules.
    """
    logger.info("Fetching Actual Wind Generation (FUELHH) for January 2026...")
    date_chunks = [
        ("2026-01-01", "2026-01-07"),
        ("2026-01-08", "2026-01-14"),
        ("2026-01-15", "2026-01-21"),
        ("2026-01-22", "2026-01-28"),
        ("2026-01-29", "2026-01-31"),
    ]
    
    all_actuals = []
    for date_from, date_to in date_chunks:
        url = f"{settings.ELEXON_FUELHH_URL}?settlementDateFrom={date_from}&settlementDateTo={date_to}&fuelType=WIND"
        logger.info(f"Querying FUELHH actuals: {date_from} to {date_to}...")
        resp = fetch_json_with_retries(url)
        items = resp.get("data", [])
        logger.info(f"Retrieved {len(items)} actuals records for {date_from} to {date_to}")
        all_actuals.extend(items)
        time.sleep(0.5)  # Friendly rate-limiting
        
    logger.info(f"Successfully collected {len(all_actuals)} total FUELHH actuals records (Expected ~1,488).")
    return all_actuals

def fetch_forecasts_january_2026():
    """
    Fetch WINDFOR stream forecasts published between 2025-12-30 and 2026-02-01.
    Covers all Day-Ahead decision gates (D-1) for January 2026.
    """
    logger.info("Fetching Forecast Wind Generation (WINDFOR) for January 2026...")
    time_windows = [
        ("2025-12-30T00:00:00Z", "2026-01-06T00:00:00Z"),
        ("2026-01-06T00:00:00Z", "2026-01-13T00:00:00Z"),
        ("2026-01-13T00:00:00Z", "2026-01-20T00:00:00Z"),
        ("2026-01-20T00:00:00Z", "2026-01-27T00:00:00Z"),
        ("2026-01-27T00:00:00Z", "2026-02-01T23:59:59Z"),
    ]
    
    all_forecasts = []
    for dt_from, dt_to in time_windows:
        url = f"{settings.ELEXON_WINDFOR_STREAM_URL}?publishDateTimeFrom={dt_from}&publishDateTimeTo={dt_to}"
        logger.info(f"Querying WINDFOR stream: {dt_from} to {dt_to}...")
        items = fetch_json_with_retries(url)
        logger.info(f"Retrieved {len(items)} forecast records for window {dt_from} to {dt_to}")
        all_forecasts.extend(items)
        time.sleep(0.5)
        
    logger.info(f"Successfully collected {len(all_forecasts)} total WINDFOR forecast records.")
    return all_forecasts

def run_ingestion():
    """Main pipeline: fetch, validate, structure, and save to local cache."""
    settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    start_time = time.time()
    actuals = fetch_actuals_january_2026()
    forecasts = fetch_forecasts_january_2026()
    
    cache_payload = {
        "metadata": {
            "source": "Elexon BMRS API",
            "datasets": ["FUELHH (fuelType=WIND)", "WINDFOR/stream"],
            "period": "January 2026",
            "extracted_at": datetime.utcnow().isoformat() + "Z",
            "total_actuals_count": len(actuals),
            "total_forecasts_count": len(forecasts)
        },
        "actuals": actuals,
        "forecasts": forecasts
    }
    
    with open(settings.CACHE_FILE, "w", encoding="utf-8") as f:
        json.dump(cache_payload, f, separators=(',', ':'))
        
    file_size_mb = settings.CACHE_FILE.stat().st_size / (1024 * 1024)
    duration = time.time() - start_time
    logger.info(f"Done! Cached {len(actuals)} actuals and {len(forecasts)} forecasts to {settings.CACHE_FILE}")
    logger.info(f"Cache file size: {file_size_mb:.2f} MB. Ingestion completed in {duration:.1f}s.")

if __name__ == "__main__":
    run_ingestion()
