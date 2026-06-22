from __future__ import annotations

from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from types import TracebackType


class QuietRequestHandler(SimpleHTTPRequestHandler):
    """Serve demo assets without writing one log line per request."""

    def log_message(self, format: str, *args: object) -> None:  # noqa: A002
        del format, args


class LocalDemoServer:
    """Small managed HTTP server used by the one-command local demo."""

    def __init__(
        self,
        root: Path,
        *,
        host: str = "127.0.0.1",
        preferred_port: int = 4173,
    ) -> None:
        resolved_root = root.resolve()
        if not resolved_root.is_dir():
            raise FileNotFoundError(f"Demo directory not found: {resolved_root}")
        if not 0 <= preferred_port <= 65535:
            raise ValueError("preferred_port must be between 0 and 65535")

        self.root = resolved_root
        self.host = host
        self.preferred_port = preferred_port
        self._server: ThreadingHTTPServer | None = None
        self._thread: Thread | None = None

    @property
    def port(self) -> int:
        if self._server is None:
            raise RuntimeError("Demo server has not been started")
        return int(self._server.server_address[1])

    @property
    def url(self) -> str:
        return f"http://{self.host}:{self.port}"

    def start(self) -> LocalDemoServer:
        if self._server is not None:
            return self

        handler = partial(QuietRequestHandler, directory=str(self.root))
        requested_ports = [self.preferred_port]
        if self.preferred_port != 0:
            requested_ports.append(0)

        last_error: OSError | None = None
        for requested_port in requested_ports:
            try:
                server = ThreadingHTTPServer((self.host, requested_port), handler)
            except OSError as exc:
                last_error = exc
                continue

            server.daemon_threads = True
            thread = Thread(
                target=server.serve_forever,
                name="wda-local-demo",
                daemon=True,
            )
            thread.start()
            self._server = server
            self._thread = thread
            return self

        message = f"Unable to bind a local demo server on {self.host}"
        if last_error is not None:
            raise OSError(message) from last_error
        raise OSError(message)

    def stop(self) -> None:
        server = self._server
        thread = self._thread
        self._server = None
        self._thread = None

        if server is None:
            return

        server.shutdown()
        server.server_close()
        if thread is not None:
            thread.join(timeout=5)

    def __enter__(self) -> LocalDemoServer:
        return self.start()

    def __exit__(
        self,
        exc_type: type[BaseException] | None,
        exc: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        del exc_type, exc, traceback
        self.stop()
