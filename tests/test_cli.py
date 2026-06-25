from __future__ import annotations

import pytest
import typer

from webdesign_ai_editor.cli import validate_http_url


def test_validate_http_url_accepts_http_and_https() -> None:
    assert validate_http_url("http://127.0.0.1:3000") == "http://127.0.0.1:3000"
    assert validate_http_url("https://localhost:8443") == "https://localhost:8443"


def test_validate_http_url_rejects_remote_targets_by_default() -> None:
    with pytest.raises(typer.BadParameter, match="loopback"):
        validate_http_url("https://example.test")


def test_validate_http_url_accepts_remote_targets_with_explicit_opt_in() -> None:
    assert (
        validate_http_url("https://example.test", allow_remote_target=True)
        == "https://example.test"
    )


@pytest.mark.parametrize("value", ["example.test", "file:///tmp/index.html", "javascript:alert(1)"])
def test_validate_http_url_rejects_non_http(value: str) -> None:
    with pytest.raises(typer.BadParameter):
        validate_http_url(value)
