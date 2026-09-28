from __future__ import annotations

import importlib


def version_of(module_name: str) -> str:
    module = importlib.import_module(module_name)
    return str(getattr(module, "__version__", "OK"))


def main() -> int:
    print(f"MetaTrader5: {version_of('MetaTrader5')}")
    print(f"FastAPI: {version_of('fastapi')}")
    print(f"Uvicorn: {version_of('uvicorn')}")
    print("Dependencias do Bridge validadas.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
