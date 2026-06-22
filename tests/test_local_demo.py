from __future__ import annotations

import socket
from pathlib import Path
from urllib.request import urlopen

import pytest

from webdesign_ai_editor.local_demo import LocalDemoServer


def make_demo(tmp_path: Path) -> Path:
    index = tmp_path / "index.html"
    index.write_text("<h1>demo-ready</h1>", encoding="utf-8")
    return tmp_path


def test_local_demo_server_serves_index(tmp_path: Path) -> None:
    root = make_demo(tmp_path)

    with LocalDemoServer(root, preferred_port=0) as server:
        with urlopen(server.url, timeout=2) as response:
            assert response.status == 200
            assert "demo-ready" in response.read().decode("utf-8")
        assert server.port > 0


def test_local_demo_server_falls_back_when_preferred_port_is_busy(tmp_path: Path) -> None:
    root = make_demo(tmp_path)

    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as occupied:
        occupied.bind(("127.0.0.1", 0))
        occupied.listen(1)
        busy_port = int(occupied.getsockname()[1])

        with LocalDemoServer(root, preferred_port=busy_port) as server:
            assert server.port != busy_port
            assert server.url.startswith("http://127.0.0.1:")


def test_local_demo_server_rejects_missing_directory(tmp_path: Path) -> None:
    with pytest.raises(FileNotFoundError):
        LocalDemoServer(tmp_path / "missing")


def test_port_is_unavailable_before_start(tmp_path: Path) -> None:
    server = LocalDemoServer(make_demo(tmp_path), preferred_port=0)

    with pytest.raises(RuntimeError, match="has not been started"):
        _ = server.port
