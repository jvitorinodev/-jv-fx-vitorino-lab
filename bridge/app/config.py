from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / ".env")


def _int(value: str | None, default: int) -> int:
    try:
        return int(value or default)
    except ValueError:
        return default


@dataclass(frozen=True)
class Settings:
    shared_secret: str = os.getenv("JVFX_BRIDGE_SHARED_SECRET", "").strip()
    allowed_origins: tuple[str, ...] = tuple(
        item.strip() for item in os.getenv("JVFX_ALLOWED_ORIGINS", "http://localhost:3000").split(",") if item.strip()
    )
    quote_interval_ms: int = max(100, min(2000, _int(os.getenv("JVFX_QUOTE_INTERVAL_MS"), 250)))
    terminal_path: str = os.getenv("MT5_TERMINAL_PATH", "").strip()
    login: int | None = _int(os.getenv("MT5_LOGIN"), 0) or None
    password: str = os.getenv("MT5_PASSWORD", "").strip()
    server: str = os.getenv("MT5_SERVER", "").strip()


settings = Settings()
