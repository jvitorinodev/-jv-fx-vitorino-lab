from __future__ import annotations

import asyncio
from datetime import datetime, timezone

from fastapi import Depends, FastAPI, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .mt5_service import TIMEFRAME_MAP, account_snapshot, candles, closed_history, closed_trade_by_position, execution_estimate, health, positions_snapshot, quote, symbol_specification
from .security import origin_allowed, require_shared_secret, verify_ws_token

app = FastAPI(title="JV FX MT5 Bridge", version="1.2.10", docs_url="/docs")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.allowed_origins),
    allow_credentials=True,
    allow_methods=["GET"],
    allow_headers=["x-jvfx-key", "content-type"],
)


@app.get("/health")
def get_health(_: None = Depends(require_shared_secret)):
    state = health()
    return {**state, "updatedAt": datetime.now(timezone.utc).isoformat()}


@app.get("/account")
def get_account(_: None = Depends(require_shared_secret)):
    try:
        return account_snapshot()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/positions")
def get_positions(_: None = Depends(require_shared_secret)):
    try:
        return positions_snapshot()
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/quote/{symbol}")
def get_quote(symbol: str, _: None = Depends(require_shared_secret)):
    try:
        return quote(symbol.upper())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/candles/{symbol}")
def get_candles(
    symbol: str,
    timeframe: str = Query(default="15M"),
    limit: int = Query(default=260, ge=50, le=1000),
    _: None = Depends(require_shared_secret),
):
    timeframe = timeframe.upper()
    if timeframe not in TIMEFRAME_MAP:
        raise HTTPException(status_code=400, detail="Timeframe não suportado.")
    try:
        return candles(symbol.upper(), timeframe, limit)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/history/closed")
def get_closed_history(
    days: int = Query(default=30, ge=1, le=3650),
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0, le=10000),
    _: None = Depends(require_shared_secret),
):
    try:
        return closed_history(days=days, limit=limit, offset=offset)
    except (RuntimeError, ValueError) as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/history/closed/{position_id}")
def get_closed_trade(position_id: int, _: None = Depends(require_shared_secret)):
    try:
        return closed_trade_by_position(position_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@app.get("/symbol/{symbol}/spec")
def get_symbol_spec(symbol: str, _: None = Depends(require_shared_secret)):
    try:
        return symbol_specification(symbol.upper())
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.get("/execution/estimate/{symbol}")
def get_execution_estimate(
    symbol: str,
    direction: str = Query(default="LONG"),
    volume: float = Query(default=0.01, gt=0),
    _: None = Depends(require_shared_secret),
):
    try:
        return execution_estimate(symbol.upper(), direction.upper(), volume)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc


@app.websocket("/ws/quotes")
async def websocket_quotes(websocket: WebSocket, token: str = Query(default="")):
    if not origin_allowed(websocket):
        await websocket.close(code=4403, reason="Origem não autorizada")
        return
    try:
        payload = verify_ws_token(token)
    except Exception as exc:
        await websocket.close(code=4401, reason=str(exc)[:100])
        return

    symbols = payload["symbols"]
    await websocket.accept()
    await websocket.send_json({"type": "ready", "provider": "MT5_BRIDGE", "symbols": symbols, "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000)})

    try:
        while True:
            for symbol in symbols:
                try:
                    raw = await asyncio.to_thread(quote, symbol)
                    bid = float(raw.get("bid", 0.0))
                    ask = float(raw.get("ask", 0.0))
                    last_value = float(raw.get("last", 0.0))
                    mid = (bid + ask) / 2 if bid and ask else last_value or bid or ask
                    await websocket.send_json({
                        "type": "quote",
                        "quote": {
                            "symbol": symbol,
                            "brokerSymbol": symbol,
                            "bid": bid,
                            "ask": ask,
                            "last": last_value,
                            "mid": mid,
                            "spread": max(0.0, ask - bid),
                            "time": int(raw.get("time", 0)),
                            "timeMs": int(raw.get("time_msc", 0)),
                            "source": "REALTIME",
                        },
                    })
                except Exception as exc:
                    await websocket.send_json({"type": "error", "message": str(exc)[:180]})
            await asyncio.sleep(settings.quote_interval_ms / 1000)
    except WebSocketDisconnect:
        return
