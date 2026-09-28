from __future__ import annotations

import threading
import math
from dataclasses import asdict, dataclass
from typing import Any

import MetaTrader5 as mt5

from .config import settings

TIMEFRAME_MAP = {
    "1M": mt5.TIMEFRAME_M1,
    "5M": mt5.TIMEFRAME_M5,
    "15M": mt5.TIMEFRAME_M15,
    "30M": mt5.TIMEFRAME_M30,
    "1H": mt5.TIMEFRAME_H1,
    "4H": mt5.TIMEFRAME_H4,
    "D": mt5.TIMEFRAME_D1,
}

_lock = threading.RLock()


@dataclass
class ConnectionState:
    connected: bool
    detail: str
    terminal: str = "MetaTrader 5"


def _initialize() -> ConnectionState:
    kwargs: dict[str, Any] = {}
    if settings.terminal_path:
        kwargs["path"] = settings.terminal_path
    if settings.login:
        kwargs["login"] = settings.login
    if settings.password:
        kwargs["password"] = settings.password
    if settings.server:
        kwargs["server"] = settings.server

    with _lock:
        ok = mt5.initialize(**kwargs) if kwargs else mt5.initialize()
        if not ok:
            return ConnectionState(False, f"mt5.initialize() falhou: {mt5.last_error()}")
        terminal = mt5.terminal_info()
        account = mt5.account_info()
        if terminal is None or account is None:
            return ConnectionState(False, f"Terminal aberto, porém sem conta conectada: {mt5.last_error()}")
        return ConnectionState(True, f"Conta {account.login} conectada em {getattr(account, 'server', '')}", getattr(terminal, "name", "MetaTrader 5"))


def ensure_connection() -> ConnectionState:
    state = _initialize()
    if not state.connected:
        raise RuntimeError(state.detail)
    return state


def health() -> dict[str, Any]:
    state = _initialize()
    return {**asdict(state)}


def account_snapshot() -> dict[str, Any]:
    ensure_connection()
    with _lock:
        row = mt5.account_info()
    if row is None:
        raise RuntimeError(f"account_info() falhou: {mt5.last_error()}")
    data = row._asdict()
    return {
        "login": data.get("login"),
        "company": data.get("company", ""),
        "server": data.get("server", ""),
        "currency": data.get("currency", "USD"),
        "balance": data.get("balance", 0.0),
        "equity": data.get("equity", 0.0),
        "margin": data.get("margin", 0.0),
        "margin_free": data.get("margin_free", 0.0),
        "margin_level": data.get("margin_level", 0.0),
        "leverage": data.get("leverage", 0),
        "profit": data.get("profit", 0.0),
    }


def ensure_symbol(symbol: str) -> None:
    ensure_connection()
    with _lock:
        info = mt5.symbol_info(symbol)
        if info is None:
            raise RuntimeError(f"Símbolo {symbol} não encontrado no terminal MT5.")
        if not info.visible and not mt5.symbol_select(symbol, True):
            raise RuntimeError(f"Não foi possível adicionar {symbol} ao Market Watch.")


def quote(symbol: str) -> dict[str, Any]:
    ensure_symbol(symbol)
    with _lock:
        tick = mt5.symbol_info_tick(symbol)
    if tick is None:
        raise RuntimeError(f"symbol_info_tick({symbol}) falhou: {mt5.last_error()}")
    data = tick._asdict()
    return {
        "symbol": symbol,
        "bid": float(data.get("bid", 0.0)),
        "ask": float(data.get("ask", 0.0)),
        "last": float(data.get("last", 0.0)),
        "time": int(data.get("time", 0)),
        "time_msc": int(data.get("time_msc", 0)),
        "volume": float(data.get("volume", 0.0)),
        "volume_real": float(data.get("volume_real", 0.0)),
    }


def candles(symbol: str, timeframe: str, limit: int) -> dict[str, Any]:
    ensure_symbol(symbol)
    mt5_timeframe = TIMEFRAME_MAP.get(timeframe)
    if mt5_timeframe is None:
        raise ValueError("Timeframe não suportado.")
    limit = max(50, min(1000, int(limit)))
    with _lock:
        rates = mt5.copy_rates_from_pos(symbol, mt5_timeframe, 0, limit)
    if rates is None:
        raise RuntimeError(f"copy_rates_from_pos({symbol}) falhou: {mt5.last_error()}")
    rows = []
    for row in rates:
        rows.append({
            "time": int(row["time"]),
            "open": float(row["open"]),
            "high": float(row["high"]),
            "low": float(row["low"]),
            "close": float(row["close"]),
            "tick_volume": int(row["tick_volume"]),
            "spread": int(row["spread"]),
            "real_volume": int(row["real_volume"]),
        })
    return {"symbol": symbol, "timeframe": timeframe, "candles": rows}


def positions_snapshot() -> list[dict[str, Any]]:
    ensure_connection()
    with _lock:
        positions = mt5.positions_get()
    if positions is None:
        raise RuntimeError(f"positions_get() falhou: {mt5.last_error()}")
    output: list[dict[str, Any]] = []
    for row in positions:
        data = row._asdict()
        output.append({
            "ticket": data.get("ticket"),
            "symbol": data.get("symbol", ""),
            "type": int(data.get("type", 0)),
            "volume": float(data.get("volume", 0.0)),
            "price_open": float(data.get("price_open", 0.0)),
            "price_current": float(data.get("price_current", 0.0)),
            "sl": float(data.get("sl", 0.0)),
            "tp": float(data.get("tp", 0.0)),
            "profit": float(data.get("profit", 0.0)),
            "swap": float(data.get("swap", 0.0)),
            "magic": int(data.get("magic", 0)),
            "time": int(data.get("time", 0)),
        })
    return output


def _weighted_average(rows: list[dict[str, Any]], price_key: str = "price") -> float:
    volume = sum(float(row.get("volume", 0.0)) for row in rows)
    if volume <= 0:
        return 0.0
    return sum(float(row.get(price_key, 0.0)) * float(row.get("volume", 0.0)) for row in rows) / volume


def _load_position_history(position_id: int) -> tuple[list[Any], list[Any]]:
    with _lock:
        deals = mt5.history_deals_get(position=position_id)
        orders = list(mt5.history_orders_get(position=position_id) or [])
    if deals is None:
        raise RuntimeError(f"history_deals_get(position={position_id}) falhou: {mt5.last_error()}")

    known_order_tickets = {int(getattr(order, "ticket", 0)) for order in orders}
    for deal in deals:
        order_ticket = int(getattr(deal, "order", 0) or 0)
        if order_ticket <= 0 or order_ticket in known_order_tickets:
            continue
        with _lock:
            extra = mt5.history_orders_get(ticket=order_ticket)
        if extra:
            orders.extend(extra)
            known_order_tickets.update(int(getattr(order, "ticket", 0)) for order in extra)
    return list(deals), orders


def _serialize_closed_trade(position_id: int, deals_raw: list[Any], orders_raw: list[Any]) -> dict[str, Any] | None:
    buy_type = int(getattr(mt5, "DEAL_TYPE_BUY", 0))
    sell_type = int(getattr(mt5, "DEAL_TYPE_SELL", 1))
    entry_in = int(getattr(mt5, "DEAL_ENTRY_IN", 0))
    entry_out = int(getattr(mt5, "DEAL_ENTRY_OUT", 1))
    entry_inout = int(getattr(mt5, "DEAL_ENTRY_INOUT", 2))
    entry_out_by = int(getattr(mt5, "DEAL_ENTRY_OUT_BY", 3))

    deals = [row._asdict() for row in deals_raw if int(row._asdict().get("type", -1)) in (buy_type, sell_type)]
    if not deals:
        return None
    # Reversões em uma única operação (INOUT) exigem reconstrução específica e não são
    # importadas automaticamente nesta versão para evitar histórico incorreto.
    if any(int(row.get("entry", -1)) == entry_inout for row in deals):
        return None

    entries = [row for row in deals if int(row.get("entry", -1)) == entry_in]
    exits = [row for row in deals if int(row.get("entry", -1)) in (entry_out, entry_out_by)]
    if not entries or not exits:
        return None

    entry_volume = sum(float(row.get("volume", 0.0)) for row in entries)
    exit_volume = sum(float(row.get("volume", 0.0)) for row in exits)
    tolerance = max(1e-8, entry_volume * 1e-6)
    if entry_volume <= 0 or abs(entry_volume - exit_volume) > tolerance:
        return None

    entries.sort(key=lambda row: (int(row.get("time_msc", 0)), int(row.get("ticket", 0))))
    exits.sort(key=lambda row: (int(row.get("time_msc", 0)), int(row.get("ticket", 0))))
    first_entry = entries[0]
    last_exit = exits[-1]
    direction = "LONG" if int(first_entry.get("type", buy_type)) == buy_type else "SHORT"
    symbol = str(first_entry.get("symbol", ""))
    with _lock:
        symbol_info = mt5.symbol_info(symbol)
    contract_size = float(getattr(symbol_info, "trade_contract_size", 0.0) or 0.0)

    orders = [row._asdict() for row in orders_raw]
    deal_order_ids = {int(row.get("order", 0)) for row in entries}
    candidates = [
        row for row in orders
        if int(row.get("position_id", 0)) == position_id or int(row.get("ticket", 0)) in deal_order_ids
    ]
    candidates.sort(key=lambda row: (int(row.get("time_setup_msc", 0)), int(row.get("ticket", 0))))

    sl = next((float(row.get("sl", 0.0)) for row in candidates if float(row.get("sl", 0.0)) > 0), 0.0)
    tp = next((float(row.get("tp", 0.0)) for row in candidates if float(row.get("tp", 0.0)) > 0), 0.0)

    gross_profit = sum(float(row.get("profit", 0.0)) for row in deals)
    commission = sum(float(row.get("commission", 0.0)) for row in deals)
    swap = sum(float(row.get("swap", 0.0)) for row in deals)
    fee = sum(float(row.get("fee", 0.0)) for row in deals)

    return {
        "position_id": str(position_id),
        "entry_deal_id": str(first_entry.get("ticket")) if first_entry.get("ticket") is not None else None,
        "exit_deal_id": str(last_exit.get("ticket")) if last_exit.get("ticket") is not None else None,
        "symbol": symbol,
        "direction": direction,
        "volume": float(entry_volume),
        "contract_size": contract_size,
        "entry_price": float(_weighted_average(entries)),
        "exit_price": float(_weighted_average(exits)),
        "sl": sl or None,
        "tp": tp or None,
        "gross_pnl": float(gross_profit),
        "commission": float(commission),
        "swap": float(swap),
        "fee": float(fee),
        "net_pnl": float(gross_profit + commission + swap + fee),
        "magic": int(first_entry.get("magic", 0)),
        "comment": str(last_exit.get("comment") or first_entry.get("comment") or ""),
        "opened_at": int(first_entry.get("time", 0)),
        "closed_at": int(last_exit.get("time", 0)),
    }


def closed_history(days: int = 30, limit: int = 100, offset: int = 0) -> dict[str, Any]:
    from datetime import datetime, timedelta, timezone

    ensure_connection()
    safe_days = max(1, min(3650, int(days)))
    safe_limit = max(1, min(500, int(limit)))
    safe_offset = max(0, min(10000, int(offset)))
    date_to = datetime.now(timezone.utc)
    date_from = date_to - timedelta(days=safe_days)

    with _lock:
        deals = mt5.history_deals_get(date_from, date_to)
        orders = mt5.history_orders_get(date_from, date_to)
        account = mt5.account_info()
    if deals is None:
        raise RuntimeError(f"history_deals_get() falhou: {mt5.last_error()}")
    if orders is None:
        orders = []

    grouped: dict[int, list[Any]] = {}
    for row in deals:
        data = row._asdict()
        position_id = int(data.get("position_id", 0))
        if position_id <= 0:
            continue
        grouped.setdefault(position_id, []).append(row)

    output: list[dict[str, Any]] = []
    all_orders = list(orders)
    entry_out = int(getattr(mt5, "DEAL_ENTRY_OUT", 1))
    entry_out_by = int(getattr(mt5, "DEAL_ENTRY_OUT_BY", 3))
    for position_id, position_deals in grouped.items():
        row = _serialize_closed_trade(position_id, position_deals, all_orders)
        if row is None:
            # Uma posição pode ter sido aberta antes da janela consultada e fechada agora.
            # Se houver deal de saída no período, buscamos o histórico completo da posição
            # para não perder operações longas na sincronização automática de 7/14/30 dias.
            has_exit_in_window = any(
                int(deal._asdict().get("entry", -1)) in (entry_out, entry_out_by)
                for deal in position_deals
            )
            if has_exit_in_window:
                try:
                    full_deals, full_orders = _load_position_history(position_id)
                    row = _serialize_closed_trade(position_id, full_deals, full_orders)
                except RuntimeError:
                    row = None
        if row is not None:
            output.append(row)

    output.sort(key=lambda row: int(row.get("closed_at", 0)), reverse=True)
    total = len(output)
    page = output[safe_offset:safe_offset + safe_limit]
    return {
        "account_login": str(getattr(account, "login", "")) if account is not None else None,
        "currency": str(getattr(account, "currency", "USD")) if account is not None else "USD",
        "days": safe_days,
        "offset": safe_offset,
        "total": total,
        "has_more": safe_offset + len(page) < total,
        "trades": page,
    }


def closed_trade_by_position(position_id: int) -> dict[str, Any]:
    ensure_connection()
    position_id = int(position_id)
    if position_id <= 0:
        raise ValueError("Ticket/position_id inválido.")
    deals, orders = _load_position_history(position_id)
    with _lock:
        account = mt5.account_info()
    if not deals:
        raise RuntimeError("Nenhuma execução fechada encontrada para esse ticket/position_id.")

    row = _serialize_closed_trade(position_id, deals, orders)
    if row is None:
        raise RuntimeError("A posição ainda está aberta, é parcial ou possui estrutura de reversão não suportada para importação automática.")
    return {
        "account_login": str(getattr(account, "login", "")) if account is not None else None,
        "currency": str(getattr(account, "currency", "USD")) if account is not None else "USD",
        "trade": row,
    }


def symbol_specification(symbol: str) -> dict[str, Any]:
    ensure_symbol(symbol)
    with _lock:
        info = mt5.symbol_info(symbol)
    if info is None:
        raise RuntimeError(f"symbol_info({symbol}) falhou: {mt5.last_error()}")
    data = info._asdict()
    return {
        "symbol": symbol,
        "digits": int(data.get("digits", 0) or 0),
        "point": float(data.get("point", 0.0) or 0.0),
        "trade_tick_size": float(data.get("trade_tick_size", 0.0) or 0.0),
        "trade_tick_value": float(data.get("trade_tick_value", 0.0) or 0.0),
        "trade_contract_size": float(data.get("trade_contract_size", 0.0) or 0.0),
        "volume_min": float(data.get("volume_min", 0.0) or 0.0),
        "volume_max": float(data.get("volume_max", 0.0) or 0.0),
        "volume_step": float(data.get("volume_step", 0.0) or 0.0),
        "currency_base": str(data.get("currency_base", "") or ""),
        "currency_profit": str(data.get("currency_profit", "") or ""),
        "currency_margin": str(data.get("currency_margin", "") or ""),
        "swap_long": float(data.get("swap_long", 0.0) or 0.0),
        "swap_short": float(data.get("swap_short", 0.0) or 0.0),
        "trade_mode": int(data.get("trade_mode", 0) or 0),
    }


def execution_estimate(symbol: str, direction: str, volume: float) -> dict[str, Any]:
    ensure_symbol(symbol)
    direction = direction.upper().strip()
    if direction not in ("LONG", "SHORT"):
        raise ValueError("Direção deve ser LONG ou SHORT.")
    if not volume or volume <= 0:
        raise ValueError("Volume deve ser maior que zero.")

    with _lock:
        info = mt5.symbol_info(symbol)
        tick = mt5.symbol_info_tick(symbol)
        account = mt5.account_info()
    if info is None or tick is None or account is None:
        raise RuntimeError(f"Não foi possível carregar dados de execução de {symbol}: {mt5.last_error()}")

    minimum = float(getattr(info, "volume_min", 0.0) or 0.0)
    maximum = float(getattr(info, "volume_max", 0.0) or 0.0)
    step = float(getattr(info, "volume_step", 0.0) or 0.0)
    safe_volume = float(volume)
    if minimum > 0 and safe_volume < minimum:
        safe_volume = minimum
    if maximum > 0 and safe_volume > maximum:
        safe_volume = maximum
    if step > 0:
        safe_volume = math.floor((safe_volume + 1e-12) / step) * step
        safe_volume = max(minimum or step, safe_volume)
        safe_volume = round(safe_volume, max(0, min(8, len(str(step).split(".")[1].rstrip("0")) if "." in str(step) else 0)))

    bid = float(getattr(tick, "bid", 0.0) or 0.0)
    ask = float(getattr(tick, "ask", 0.0) or 0.0)
    action = mt5.ORDER_TYPE_BUY if direction == "LONG" else mt5.ORDER_TYPE_SELL
    entry_price = ask if direction == "LONG" else bid
    close_price = bid if direction == "LONG" else ask
    if entry_price <= 0:
        raise RuntimeError("Preço de entrada indisponível no MT5.")

    with _lock:
        margin = mt5.order_calc_margin(action, symbol, safe_volume, entry_price)
        spread_pnl = mt5.order_calc_profit(action, symbol, safe_volume, entry_price, close_price)
    if margin is None:
        raise RuntimeError(f"order_calc_margin({symbol}) falhou: {mt5.last_error()}")

    equity = float(getattr(account, "equity", 0.0) or 0.0)
    free_margin = float(getattr(account, "margin_free", 0.0) or 0.0)
    leverage = int(getattr(account, "leverage", 0) or 0)
    contract_size = float(getattr(info, "trade_contract_size", 0.0) or 0.0)
    notional = abs(entry_price * contract_size * safe_volume)
    point = float(getattr(info, "point", 0.0) or 0.0)
    spread = max(0.0, ask - bid)
    spread_points = spread / point if point > 0 else 0.0
    spread_cost = abs(float(spread_pnl or 0.0))
    committed_pct = (float(margin) / equity * 100.0) if equity > 0 else 0.0

    return {
        "symbol": symbol,
        "direction": direction,
        "volume": safe_volume,
        "bid": bid,
        "ask": ask,
        "entry_price": entry_price,
        "spread": spread,
        "spread_points": spread_points,
        "estimated_spread_cost": spread_cost,
        "commission_estimate": None,
        "margin_required": float(margin),
        "capital_committed_pct": committed_pct,
        "account_equity": equity,
        "account_free_margin": free_margin,
        "account_currency": str(getattr(account, "currency", "USD") or "USD"),
        "leverage": leverage,
        "notional_value": notional,
        "specification": symbol_specification(symbol),
        "note": "Taxa estimada calculada pelo custo imediato do spread. Comissão separada depende do tipo de conta/instrumento e só é confirmada pela corretora quando aplicável.",
    }
