import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import search
from app.routers import gap_analysis
from app.routers import dashboard
from app.routers import auth

# Create all DB tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Ethical Research Assistant API",
    description="AI-powered research gap identification system",
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Auth
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])

# Phase 1 — Literature search
app.include_router(search.router, prefix="/api/v1", tags=["Phase 1 — Literature Search"])

# Phase 2 — Gap analysis
app.include_router(gap_analysis.router, prefix="/api/v1", tags=["Phase 2 — Gap Analysis"])

app.include_router(dashboard.router, prefix="/api/v1", tags=["Dashboard"])


@app.get("/")
async def root():
    return {"message": "Research Assistant API is running"}


@app.get("/health")
async def health():
    return {"status": "ok"}