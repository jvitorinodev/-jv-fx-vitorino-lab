from __future__ import annotations

import platform
import struct
import sys


def main() -> int:
    bits = struct.calcsize("P") * 8
    version = platform.python_version()
    system = platform.system()

    print(f"Python {version} | {bits}-bit | {system}")

    if system != "Windows":
        print("ERRO: o Bridge MT5 precisa rodar no Windows, junto do MetaTrader 5 Desktop.")
        return 1

    if bits != 64:
        print("ERRO: use Python 64-bit para o pacote MetaTrader5.")
        return 1

    if sys.version_info < (3, 10):
        print("ERRO: use Python 3.10 ou superior.")
        return 1

    print("Python compativel com o Bridge MT5.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
