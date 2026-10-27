# AERO-GRID UK: Wind Power Day-Ahead Forecasting & Procurement Portal

> **UK Electricity Wholesale Market (Great Britain / National Grid ESO)**  
> Decision-Support & Quantitative Uncertainty Platform for Day-Ahead Power Procurement Desks.  
> Target Period: **January 2026** (1,488 Half-Hour Settlement Periods).

---

## ⚡ Executive Summary & Problem Setting

In Great Britain's wholesale electricity market, day-ahead power auctions (e.g. EPEX SPOT, Nord Pool) close at **11:00 GMT on Day $D-1$** (Gate Closure). Energy utility procurement desks must decide before this deadline how much conventional/thermal power to purchase for tomorrow ($D$) to meet consumer demand beyond variable renewable (wind) generation.

* **Over-forecasting wind:** Utility under-procures thermal power. Real-time wind falls short $\rightarrow$ utility is "short" and penalised with punitive Balancing Mechanism cash-out prices (£95–£250+/MWh).
* **Under-forecasting wind:** Utility over-procures thermal power. Excess energy is spilled or discounted $\rightarrow$ unnecessary thermal procurement costs.

**AERO-GRID UK** bridges meteorological forecasting and commercial power trading. It reconstructs the exact latest wind forecast available at 11:00 GMT on $D-1$ across all 48 half-hour Settlement Periods, quantitatively evaluates forecast error (MAE, RMSE, MAPE, Bias), and calculates dynamic error safety buffers to mitigate asymmetric financial risk in the Balancing Mechanism.

---

## 🚀 Key Features

1. **Day-Ahead Settlement Period Explorer (48 SPs):**
   * Realistic $D-1$ Gate Closure Cutoff (default **11:00 GMT**, customizable to 07:00, 09:00, 14:00, 16:00).
   * Interactive 48-period generation curve (Actuals vs Day-Ahead Forecast) highlighting the **UK Evening Peak (SP 34–40: 16:30–20:00)**.
   * Granular accuracy breakdown table with instant CSV export.
2. **Procurement Decision Assistant (Commercial Decision Support):**
   * Utility base demand simulator (20 GW to 45 GW).
   * Quantified risk tolerance selector (**P50 Neutral**, **P75 Balanced**, **P90 Conservative**).
   * Quantifies **Net Balancing Risk Avoided (£ GBP)** and recommends thermal procurement schedules.
3. **January 2026 Macro Analytics Engine:**
   * 31-day daily forecast error calendar heatmap with one-click drill-down.
   * Intraday 48-period error profile revealing peak-hour vulnerability.
   * Error distribution histogram classifying under- vs over-forecast risk.

---

## 📁 Project Directory Structure

```
uk-forcast/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── routes.py         # FastAPI REST endpoints (days, day breakdown, macro, simulate)
│   │   ├── core/
│   │   │   └── config.py         # Market constants, Elexon endpoints, app settings
│   │   ├── models/
│   │   │   └── schemas.py        # Pydantic v2 data models & request/response validation
│   │   ├── services/
│   │   │   ├── data_service.py   # Ingestion, cache loader, temporal alignment (hourly to 30-min)
│   │   │   └── procurement_service.py # Risk buffer engine, demand curve, balancing penalty model
│   │   └── main.py               # FastAPI application entrypoint with lifespan cache hydration
│   ├── scripts/
│   │   └── fetch_data.py         # Ingestion script with 7-day chunking for Elexon BMRS API
│   ├── tests/
│   │   └── test_api.py           # Pytest test suite (5/5 unit and integration tests)
│   ├── Dockerfile                # Production Python 3.11 container definition
│   └── requirements.txt          # Python dependencies (FastAPI, uvicorn, pandas, numpy, httpx)
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx        # Navigation, live status badge, branding
│   │   │   ├── ControlBar.jsx    # Date selector, D-1 gate cutoff dropdown, scenario presets
│   │   │   ├── DayAheadView.jsx  # Recharts 48-SP generation curve, scorecards, data table
│   │   │   ├── ProcurementSimulator.jsx # Risk buffer simulator, demand curve, penalty hedge
│   │   │   └── MonthlyMacroView.jsx     # 31-day calendar heatmap, intraday profile, histogram
│   │   ├── api.js                # Frontend API client
│   │   ├── App.jsx               # Main application container and routing
│   │   └── index.css             # Dark-slate trading terminal design tokens & animations
│   ├── nginx.conf                # Nginx production reverse-proxy configuration
│   ├── Dockerfile                # Multi-stage container build (Node 22 + Nginx)
│   ├── package.json              # Frontend dependencies (React 19, Recharts, Lucide React)
│   └── vite.config.js            # Vite bundler configuration
├── data/
│   └── elexon_jan2026_cache.json # Pre-cached January 2026 dataset (1,488 actuals, 19,856 forecasts)
├── docker-compose.yml            # Unified single-command stack launch
└── README.md                     # System documentation & setup guide
```

---

## ⚙️ How to Start the Application

### Option 1: Quick Local Run (Without Docker)

#### Prerequisites
* Python 3.10+
* Node.js 18+ and npm

#### 1. Start the Backend API Server
```bash
# From project root
pip install -r backend/requirements.txt
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
* Interactive Swagger API docs: **`http://localhost:8000/docs`**

#### 2. Start the Frontend React Client
```bash
cd frontend
npm install
npm run dev
```
* Trading Desk Web App: **`http://localhost:5173/`**

---

### Option 2: Run with Docker Compose (Recommended)

To launch the full stack in isolated production containers:
```bash
docker compose up --build
```
* Frontend Web App: **`http://localhost:3000`**
* Backend REST API: **`http://localhost:8000/docs`**

---

## 🧪 Running Automated Tests

Run the backend unit and integration test suite:
```bash
python -m pytest backend/tests/test_api.py -v
```
All 5 tests pass in ~2.6 seconds, validating:
1. Healthcheck & dataset cache integrity (all 1,488 SPs loaded).
2. 31-day January 2026 date enumeration.
3. 48-period Day-Ahead alignment and mathematical invariants ($RMSE \ge MAE$).
4. Monthly macro aggregations and error distribution bins.
5. Operational procurement risk buffering and cost hedge calculations.

---

## 🤖 AI Tools Disclosure

As explicitly requested in the challenge document:
* **AI Assistance:** Google DeepMind's Antigravity agentic coding assistant was utilized for domain research on the UK Elexon BMRS API (`FUELHH` and `WINDFOR`), architectural structuring, and documentation drafting. All code, analytical formulas, and test suites were verified and validated against real January 2026 data.
