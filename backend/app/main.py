import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from backend.app.core.config import settings
from backend.app.api.routes import router as api_router
from backend.app.services.data_service import data_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("uk-forecast-app")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initializes and pre-heats in-memory cache upon application startup."""
    logger.info("Initializing UK Wind Power Forecasting & Procurement Engine...")
    try:
        data_service.load_cache()
        logger.info("Cache loaded successfully. Engine is ready for high-concurrency requests.")
    except Exception as e:
        logger.error(f"Error loading cache during startup: {e}")
    yield
    logger.info("Shutting down forecasting engine.")

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="""
    ## UK Wind Power Day-Ahead Forecasting & Procurement Portal
    
    A specialized decision-support and quantitative analytics platform designed for UK energy utilities 
    trading in the Day-Ahead wholesale power market.
    
    ### Key Capabilities:
    * **Decision Cutoff Simulation:** Real-time alignment of actual generation with the latest forecast published prior to D-1 Gate Closure (11:00 GMT).
    * **Quantitative Reliability Engine:** Evaluates MAE, RMSE, MAPE, and directional Bias across all 1,488 half-hour Settlement Periods in January 2026.
    * **Operational Decision Support:** Risk-adjusted thermal procurement optimizer that calculates safety buffers to protect against volatile cash-out penalties in the Balancing Mechanism.
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Enable CORS for frontend development and cloud deployment
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/", include_in_schema=False)
async def root():
    """Redirect root path to interactive Swagger documentation."""
    return RedirectResponse(url="/docs")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host="0.0.0.0", port=8000, reload=True)
