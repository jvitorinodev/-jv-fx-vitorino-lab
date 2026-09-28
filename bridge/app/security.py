from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import Header, HTTPException, WebSocket

from .config import settings


def require_shared_secret(x_jvfx_key: str | None = Header(default=None)) -> None:
    if not settings.shared_secret:
        raise HTTPException(status_code=503, detail="JVFX_BRIDGE_SHARED_SECRET não configurado.")
    if not x_jvfx_key or not hmac.compare_digest(x_jvfx_key, settings.shared_secret):
        raise HTTPException(status_code=401, detail="Credencial do bridge inválida.")


def _decode_base64url(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def verify_ws_token(token: str) -> dict[str, Any]:
    if not settings.shared_secret:
        raise ValueError("Bridge sem segredo configurado.")
    try:
        body, signature = token.split(".", 1)
    except ValueError as exc:
        raise ValueError("Token malformado.") from exc

    expected = base64.urlsafe_b64encode(
        hmac.new(settings.shared_secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).digest()
    ).decode("ascii").rstrip("=")
    if not hmac.compare_digest(signature, expected):
        raise ValueError("Assinatura inválida.")

    payload = json.loads(_decode_base64url(body))
    if int(payload.get("exp", 0)) < int(time.time()):
        raise ValueError("Token expirado.")
    symbols = payload.get("symbols")
    if not isinstance(symbols, list) or not symbols or len(symbols) > 10:
        raise ValueError("Lista de ativos inválida.")
    payload["symbols"] = [str(symbol).upper()[:32] for symbol in symbols]
    return payload


def origin_allowed(websocket: WebSocket) -> bool:
    origin = websocket.headers.get("origin")
    if not origin:
        return True
    return origin in settings.allowed_origins
