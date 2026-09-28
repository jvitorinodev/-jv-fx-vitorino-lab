from __future__ import annotations

import secrets
from pathlib import Path

BRIDGE_DIR = Path(__file__).resolve().parents[1]
PROJECT_DIR = BRIDGE_DIR.parent
BRIDGE_ENV = BRIDGE_DIR / ".env"
BRIDGE_ENV_EXAMPLE = BRIDGE_DIR / ".env.example"
PROJECT_ENV = PROJECT_DIR / ".env.local"
PROJECT_ENV_EXAMPLE = PROJECT_DIR / ".env.example"


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8-sig") if path.exists() else ""


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    for raw in read_text(path).splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def set_env_value(path: Path, key: str, value: str) -> None:
    lines = read_text(path).splitlines()
    output: list[str] = []
    replaced = False

    for raw in lines:
        stripped = raw.lstrip()
        if stripped.startswith(f"{key}="):
            output.append(f"{key}={value}")
            replaced = True
        else:
            output.append(raw)

    if not replaced:
        if output and output[-1].strip():
            output.append("")
        output.append(f"{key}={value}")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")


def ensure_file(path: Path, example: Path) -> None:
    if path.exists():
        return
    if example.exists():
        path.write_text(read_text(example), encoding="utf-8")
    else:
        path.write_text("", encoding="utf-8")


def secret_needs_replacement(value: str) -> bool:
    normalized = value.strip().lower()
    return (
        not normalized
        or normalized.startswith("troque-")
        or normalized in {"changeme", "change-me", "your-secret", "seu-segredo"}
        or len(value.strip()) < 24
    )


def main() -> int:
    ensure_file(BRIDGE_ENV, BRIDGE_ENV_EXAMPLE)
    ensure_file(PROJECT_ENV, PROJECT_ENV_EXAMPLE)

    bridge_values = parse_env(BRIDGE_ENV)
    project_values = parse_env(PROJECT_ENV)

    bridge_secret = bridge_values.get("JVFX_BRIDGE_SHARED_SECRET", "")
    project_secret = project_values.get("MT5_BRIDGE_SHARED_SECRET", "")

    if not secret_needs_replacement(bridge_secret):
        secret = bridge_secret
    elif not secret_needs_replacement(project_secret):
        secret = project_secret
    else:
        secret = secrets.token_urlsafe(48)
        print("Novo segredo local do Bridge gerado automaticamente.")

    set_env_value(BRIDGE_ENV, "JVFX_BRIDGE_SHARED_SECRET", secret)
    set_env_value(BRIDGE_ENV, "JVFX_ALLOWED_ORIGINS", "http://localhost:3000")
    set_env_value(PROJECT_ENV, "MT5_BRIDGE_SHARED_SECRET", secret)
    set_env_value(PROJECT_ENV, "MT5_BRIDGE_HTTP_URL", "http://127.0.0.1:8765")
    set_env_value(PROJECT_ENV, "MT5_BRIDGE_WS_URL", "ws://127.0.0.1:8765/ws/quotes")
    set_env_value(PROJECT_ENV, "MARKET_DATA_PROVIDER", "mt5")

    print("bridge/.env e .env.local sincronizados com o mesmo segredo.")
    print("MARKET_DATA_PROVIDER=mt5 ativado para usar os dados da conta conectada no MetaTrader 5.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
