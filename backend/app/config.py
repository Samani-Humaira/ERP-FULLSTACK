import os
from dotenv import load_dotenv

load_dotenv()

print("DB URL:", os.getenv("DATABASE_URL"))

class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:pass123@localhost:5432/research_assistant")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-secret")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_EXPIRE_MINUTES: int = int(os.getenv("JWT_EXPIRE_MINUTES", 10080))  # 7 days
    SEMANTIC_SCHOLAR_API_KEY: str = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "")
    CROSSREF_MAILTO: str = os.getenv("CROSSREF_MAILTO", "")


settings = Settings()