from __future__ import annotations

import socket


def main() -> int:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.5)
        return 0 if sock.connect_ex(("127.0.0.1", 8765)) == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
