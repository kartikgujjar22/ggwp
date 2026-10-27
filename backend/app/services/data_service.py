import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from pathlib import Path
import pandas as pd
import numpy as np

from backend.app.core.config import settings
from backend.app.models.schemas import (
    SettlementPeriodRecord,
    DayMetrics,
    DayDataResponse,
    DaySummaryItem,
    SettlementPeriodProfile,
    ErrorDistributionBin,
    MonthlySummaryResponse,
)

logger = logging.getLogger(__name__)

class DataService:
    def __init__(self):
        self.df_actuals: Optional[pd.DataFrame] = None
        self.df_forecasts: Optional[pd.DataFrame] = None
        self._is_loaded: bool = False

    def load_cache(self, force_reload: bool = False):
        """Loads cached January 2026 Elexon data from disk into memory."""
        if self._is_loaded and not force_reload:
            return

        if not settings.CACHE_FILE.exists():
            logger.warning(f"Cache file {settings.CACHE_FILE} not found. Running fetch script...")
            from backend.scripts.fetch_data import run_ingestion
            run_ingestion()

        logger.info(f"Loading cached Elexon data from {settings.CACHE_FILE}...")
        with open(settings.CACHE_FILE, "r", encoding="utf-8") as f:
            data = json.load(f)

        # Process Actuals (FUELHH)
        df_act = pd.DataFrame(data["actuals"])
        df_act = df_act[df_act["fuelType"] == "WIND"].copy()
        df_act["generation"] = pd.to_numeric(df_act["generation"], errors="coerce").fillna(0.0)
        df_act["startTime"] = pd.to_datetime(df_act["startTime"], utc=True)
        df_act["settlementDate"] = df_act["settlementDate"].astype(str)
        df_act["settlementPeriod"] = df_act["settlementPeriod"].astype(int)
        self.df_actuals = df_act.sort_values(["settlementDate", "settlementPeriod"]).reset_index(drop=True)

        # Process Forecasts (WINDFOR)
        df_fc = pd.DataFrame(data["forecasts"])
        df_fc["generation"] = pd.to_numeric(df_fc["generation"], errors="coerce").fillna(0.0)
        df_fc["startTime"] = pd.to_datetime(df_fc["startTime"], utc=True)
        df_fc["publishTime"] = pd.to_datetime(df_fc["publishTime"], utc=True)
        self.df_forecasts = df_fc.sort_values("publishTime").reset_index(drop=True)

        self._is_loaded = True
        logger.info(f"Loaded {len(self.df_actuals)} actuals and {len(self.df_forecasts)} forecasts into memory.")

    def _get_time_label(self, sp: int) -> str:
        """Returns human-readable time string for Settlement Period (1 to 48)."""
        start_min_total = (sp - 1) * 30
        end_min_total = sp * 30
        sh, sm = divmod(start_min_total, 60)
        eh, em = divmod(end_min_total, 60)
        eh_str = "24" if eh == 24 else f"{eh:02d}"
        return f"{sh:02d}:{sm:02d} - {eh_str}:{em:02d}"

    def get_aligned_day_data(
        self,
        delivery_date: str,
        cutoff_hour: int = settings.DEFAULT_CUTOFF_HOUR_D_MINUS_1,
        cutoff_minute: int = settings.DEFAULT_CUTOFF_MINUTE_D_MINUS_1,
    ) -> DayDataResponse:
        """
        Aligns actuals and latest day-ahead forecasts for a given delivery date (YYYY-MM-DD).
        Applies decision gate closure on D-1 at cutoff_hour:cutoff_minute GMT.
        Maps hourly WINDFOR forecasts to the two 30-min settlement periods in each hour.
        """
        if not self._is_loaded:
            self.load_cache()

        # 1. Filter actuals for the delivery date (all 48 SPs)
        day_act = self.df_actuals[self.df_actuals["settlementDate"] == delivery_date].copy()
        if day_act.empty:
            raise ValueError(f"No actuals found for delivery date {delivery_date}")

        # 2. Compute D-1 cutoff datetime
        delivery_dt = pd.to_datetime(delivery_date, utc=True)
        cutoff_dt = delivery_dt - pd.Timedelta(days=1) + pd.Timedelta(hours=cutoff_hour, minutes=cutoff_minute)

        # 3. Filter forecasts published BEFORE or AT cutoff time
        eligible_fc = self.df_forecasts[self.df_forecasts["publishTime"] <= cutoff_dt].copy()
        if eligible_fc.empty:
            # Fallback if cutoff is too early: take all forecasts published prior to delivery start
            eligible_fc = self.df_forecasts[self.df_forecasts["publishTime"] <= delivery_dt].copy()

        # For hourly mapping: WINDFOR startTime is at :00 of the hour.
        # Floor actuals startTime to the nearest hour to join with hourly forecast.
        day_act["hour_start"] = day_act["startTime"].dt.floor("h")

        # Pick latest available forecast for each hour
        hourly_fcs = eligible_fc[
            (eligible_fc["startTime"] >= delivery_dt) &
            (eligible_fc["startTime"] < delivery_dt + pd.Timedelta(days=1))
        ]
        
        # Latest forecast published for each hour
        latest_hourly_fc = (
            hourly_fcs.sort_values("publishTime")
            .groupby("startTime")
            .last()
            .reset_index()
            .rename(columns={"startTime": "hour_start", "generation": "forecast_mw", "publishTime": "fc_publish_time"})
        )

        merged = pd.merge(day_act, latest_hourly_fc, on="hour_start", how="left")
        
        # If any missing (edge case), backfill/forward-fill
        merged["forecast_mw"] = merged["forecast_mw"].ffill().bfill().fillna(merged["generation"])
        default_pub = cutoff_dt.isoformat()
        merged["fc_publish_time"] = merged["fc_publish_time"].fillna(cutoff_dt)

        # Calculate error metrics
        merged["error_mw"] = merged["forecast_mw"] - merged["generation"]
        merged["abs_error_mw"] = merged["error_mw"].abs()
        
        # Guard against division by near-zero generation for percentage
        merged["error_pct"] = np.where(
            merged["generation"] > 50.0,
            (merged["abs_error_mw"] / merged["generation"]) * 100.0,
            (merged["abs_error_mw"] / 50.0) * 100.0
        )

        records: List[SettlementPeriodRecord] = []
        for _, row in merged.iterrows():
            sp = int(row["settlementPeriod"])
            records.append(
                SettlementPeriodRecord(
                    settlement_period=sp,
                    start_time=row["startTime"].isoformat(),
                    time_label=self._get_time_label(sp),
                    actual_generation_mw=round(float(row["generation"]), 1),
                    forecast_generation_mw=round(float(row["forecast_mw"]), 1),
                    forecast_publish_time=row["fc_publish_time"].isoformat(),
                    error_mw=round(float(row["error_mw"]), 1),
                    abs_error_mw=round(float(row["abs_error_mw"]), 1),
                    error_percentage=round(float(row["error_pct"]), 1),
                    is_over_forecast=bool(row["error_mw"] > 0)
                )
            )

        mae = float(merged["abs_error_mw"].mean())
        rmse = float(np.sqrt((merged["error_mw"] ** 2).mean()))
        mape = float(merged["error_pct"].mean())
        bias = float(merged["error_mw"].mean())
        tot_act_mwh = float(merged["generation"].sum() * 0.5)
        tot_fc_mwh = float(merged["forecast_mw"].sum() * 0.5)
        
        max_idx = merged["abs_error_mw"].idxmax()
        max_err_mw = float(merged.loc[max_idx, "abs_error_mw"])
        max_err_sp = int(merged.loc[max_idx, "settlementPeriod"])
        over_count = int((merged["error_mw"] > 0).sum())
        under_count = int((merged["error_mw"] < 0).sum())

        metrics = DayMetrics(
            mae=round(mae, 1),
            rmse=round(rmse, 1),
            mape=round(mape, 1),
            bias=round(bias, 1),
            total_actual_mwh=round(tot_act_mwh, 1),
            total_forecast_mwh=round(tot_fc_mwh, 1),
            max_error_mw=round(max_err_mw, 1),
            max_error_sp=max_err_sp,
            over_forecast_count=over_count,
            under_forecast_count=under_count
        )

        return DayDataResponse(
            delivery_date=delivery_date,
            decision_gate_cutoff=f"D-1 {cutoff_hour:02d}:{cutoff_minute:02d} GMT",
            metrics=metrics,
            periods=records
        )

    def get_monthly_summary(
        self,
        cutoff_hour: int = settings.DEFAULT_CUTOFF_HOUR_D_MINUS_1,
        cutoff_minute: int = settings.DEFAULT_CUTOFF_MINUTE_D_MINUS_1,
    ) -> MonthlySummaryResponse:
        """
        Computes monthly aggregations across all 31 days of January 2026.
        Returns daily scorecards, Settlement Period hourly profiles, and error distributions.
        """
        if not self._is_loaded:
            self.load_cache()

        dates = sorted(self.df_actuals["settlementDate"].unique())
        day_summaries: List[DaySummaryItem] = []
        all_period_records: List[Dict[str, Any]] = []

        for d in dates:
            day_data = self.get_aligned_day_data(d, cutoff_hour, cutoff_minute)
            day_summaries.append(
                DaySummaryItem(
                    date=d,
                    mae=day_data.metrics.mae,
                    rmse=day_data.metrics.rmse,
                    mape=day_data.metrics.mape,
                    bias=day_data.metrics.bias,
                    avg_actual_mw=round(day_data.metrics.total_actual_mwh / 24.0, 1),
                    avg_forecast_mw=round(day_data.metrics.total_forecast_mwh / 24.0, 1),
                    max_error_mw=day_data.metrics.max_error_mw,
                    max_error_sp=day_data.metrics.max_error_sp
                )
            )
            for p in day_data.periods:
                all_period_records.append({
                    "date": d,
                    "sp": p.settlement_period,
                    "actual": p.actual_generation_mw,
                    "forecast": p.forecast_generation_mw,
                    "error": p.error_mw,
                    "abs_error": p.abs_error_mw,
                    "error_pct": p.error_percentage
                })

        df_all = pd.DataFrame(all_period_records)

        # Monthly Overall
        overall_mae = round(float(df_all["abs_error"].mean()), 1)
        overall_rmse = round(float(np.sqrt((df_all["error"] ** 2).mean())), 1)
        overall_mape = round(float(df_all["error_pct"].mean()), 1)
        overall_bias = round(float(df_all["error"].mean()), 1)
        tot_act_twh = round(float(df_all["actual"].sum() * 0.5 / 1e6), 3)
        tot_fc_twh = round(float(df_all["forecast"].sum() * 0.5 / 1e6), 3)

        # Settlement Period Hourly Profile (1 to 48)
        sp_profiles: List[SettlementPeriodProfile] = []
        sp_grouped = df_all.groupby("sp")
        for sp, grp in sp_grouped:
            sp_int = int(sp)
            sp_mae = float(grp["abs_error"].mean())
            sp_rmse = float(np.sqrt((grp["error"] ** 2).mean()))
            sp_bias = float(grp["error"].mean())
            is_peak = (34 <= sp_int <= 40)  # 16:30 - 20:00 UK evening peak
            sp_profiles.append(
                SettlementPeriodProfile(
                    settlement_period=sp_int,
                    time_label=self._get_time_label(sp_int),
                    avg_actual_mw=round(float(grp["actual"].mean()), 1),
                    avg_forecast_mw=round(float(grp["forecast"].mean()), 1),
                    avg_mae=round(sp_mae, 1),
                    avg_rmse=round(sp_rmse, 1),
                    avg_bias=round(sp_bias, 1),
                    is_peak_period=is_peak
                )
            )

        # Error Distribution Histogram
        errors = df_all["error"]
        bins = [-6000, -3000, -1500, -500, 500, 1500, 3000, 6000]
        labels = [
            "Severe Under (>3000 MW)",
            "Moderate Under (1500-3000 MW)",
            "Minor Under (500-1500 MW)",
            "Accurate (±500 MW)",
            "Minor Over (500-1500 MW)",
            "Moderate Over (1500-3000 MW)",
            "Severe Over (>3000 MW)"
        ]
        counts, _ = np.histogram(errors, bins=bins)
        total_p = len(errors)
        distribution: List[ErrorDistributionBin] = []
        for i, count in enumerate(counts):
            distribution.append(
                ErrorDistributionBin(
                    bin_range=labels[i],
                    bin_min=float(bins[i]),
                    bin_max=float(bins[i+1]),
                    count=int(count),
                    percentage=round(float(count / total_p * 100.0), 1)
                )
            )

        return MonthlySummaryResponse(
            target_month="January 2026",
            total_settlement_periods=len(df_all),
            decision_gate_cutoff=f"D-1 {cutoff_hour:02d}:{cutoff_minute:02d} GMT",
            overall_mae=overall_mae,
            overall_rmse=overall_rmse,
            overall_mape=overall_mape,
            overall_bias=overall_bias,
            total_actual_twh=tot_act_twh,
            total_forecast_twh=tot_fc_twh,
            days=day_summaries,
            sp_hourly_profile=sp_profiles,
            error_distribution=distribution
        )

# Global singleton service
data_service = DataService()
