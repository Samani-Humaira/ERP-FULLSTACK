import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import auth
from app.routers import project as project_router
from app.routers import collaboration

# Create DB tables if missing
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Mini Research Assistant API for tests")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(project_router.router, prefix="/api/v1", tags=["Projects"])
app.include_router(collaboration.router, prefix="/api/v1", tags=["Collab"])

@app.get("/")
async def root():
    return {"message": "Mini API running"}
