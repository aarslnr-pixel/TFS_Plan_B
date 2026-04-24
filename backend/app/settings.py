from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Object Eraser API"
    api_prefix: str = "/api"
    cors_origins: list[str] = ["http://localhost:3000"]
    storage_dir: Path = Path("./storage")
    preview_max_px: int = 640
    preview_quality: int = 82
    default_inpaint_radius: int = 5
    enable_optional_sam: bool = False
    sam_checkpoint_path: str | None = None
    sam_model_type: str = "vit_b"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


settings = Settings()
settings.storage_dir.mkdir(parents=True, exist_ok=True)
