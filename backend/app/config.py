import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    # Read and strip string values to avoid accidental leading/trailing spaces
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://postgres:your-password@localhost:5432/research_assistant")
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-this-secret").strip()
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256").strip()

    _jwt_raw = os.getenv("JWT_EXPIRE_MINUTES", "").strip()
    JWT_EXPIRE_MINUTES: int = int(_jwt_raw) if _jwt_raw else 10080  # 7 days

    SEMANTIC_SCHOLAR_API_KEY: str = os.getenv("SEMANTIC_SCHOLAR_API_KEY", "").strip()
    CROSSREF_MAILTO: str = os.getenv("CROSSREF_MAILTO", "").strip()

    # OpenAI-compatible chat completion provider for the editor assistant
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "").strip()
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "https://api.openai.com/v1").strip().rstrip("/")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gpt-4o-mini").strip()
    LLM_FALLBACK_MODEL: str = os.getenv(
        "LLM_FALLBACK_MODEL",
        "gemini-3.7-flash" if "generativelanguage.googleapis.com" in LLM_BASE_URL else "",
    ).strip()
    LLM_FALLBACK_MODELS: list[str] = [
        model.strip()
        for model in os.getenv("LLM_FALLBACK_MODELS", "").split(",")
        if model.strip()
    ]

    # SMTP / email settings for sending invites
    SMTP_HOST: str = os.getenv("SMTP_HOST", "").strip()
    _smtp_port = os.getenv("SMTP_PORT", "587").strip()
    SMTP_PORT: int = int(_smtp_port) if _smtp_port else 587
    SMTP_USER: str = os.getenv("SMTP_USER", "").strip()
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "").strip()
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@example.com").strip()
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").strip().lower() in ("1", "true", "yes")

    # Frontend URL for invite links
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
    # When true, save raw sent emails to backend/email_logs for debugging
    SAVE_SENT_EMAILS: bool = os.getenv("SAVE_SENT_EMAILS", "false").strip().lower() in ("1", "true", "yes")


settings = Settings()