from __future__ import annotations

from pathlib import Path

from platformdirs import user_data_path
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables and `.env`."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="WDA_",
        case_sensitive=False,
        extra="ignore",
    )

    ollama_base_url: str = "http://127.0.0.1:11434"
    ollama_model: str = "gemma4"
    ollama_timeout_seconds: float = Field(default=120.0, gt=0, le=600)
    api_host: str = "127.0.0.1"
    api_port: int = Field(default=8787, ge=1, le=65535)
    data_dir: Path = Field(
        default_factory=lambda: user_data_path(
            appname="webdesign-ai-editor",
            appauthor="Carlos Selva",
            ensure_exists=True,
        )
    )
    log_level: str = "INFO"

    @property
    def sessions_dir(self) -> Path:
        path = self.data_dir / "sessions"
        path.mkdir(parents=True, exist_ok=True)
        return path
