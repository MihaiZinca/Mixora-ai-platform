from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    database_url: str
    qdrant_url: str
    llm_api_key: str = ""
    llm_provider: str = "ollama"
    llm_model: str = "llama3.2:1b"
    ollama_url: str = "http://localhost:11434"

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()