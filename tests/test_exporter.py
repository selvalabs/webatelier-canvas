from __future__ import annotations

import base64
from pathlib import Path
from zipfile import ZipFile

import pytest
from pydantic import ValidationError

from webdesign_ai_editor.domain.export_models import ExportPayload
from webdesign_ai_editor.services.exporter import ExportService


def make_payload(**overrides: object) -> ExportPayload:
    values: dict[str, object] = {
        "export_filename": "demo-site",
        "project_name": "Demo Site",
        "page_title": "Demo",
        "description": "Export test",
        "source_url": "http://127.0.0.1:4173",
        "html": "<!doctype html><html><head><link rel=\"icon\" href=\"__WDA_FAVICON_PATH__\"></head><body><h1>Demo</h1></body></html>",
        "css": "h1 { font-size: 48px; }",
        "warnings": ["Scripts were removed."],
    }
    values.update(overrides)
    return ExportPayload.model_validate(values)


def test_export_service_builds_deterministic_zip(tmp_path: Path) -> None:
    service = ExportService(tmp_path / "exports")
    payload = make_payload()

    first = service.export(payload)
    first_bytes = first.archive_path.read_bytes()
    second = service.export(payload)

    assert first_bytes == second.archive_path.read_bytes()
    assert first.files == ["REPORT.md", "index.html", "metadata.json", "styles.css"]

    with ZipFile(first.archive_path) as archive:
        assert archive.namelist() == sorted(archive.namelist())
        assert archive.read("index.html").decode("utf-8").startswith("<!doctype html>")
        assert "font-size: 48px" in archive.read("styles.css").decode("utf-8")
        assert "Scripts were removed." in archive.read("REPORT.md").decode("utf-8")


def test_export_service_embeds_allowlisted_favicon(tmp_path: Path) -> None:
    icon = base64.b64encode(b"icon-bytes").decode("ascii")
    payload = make_payload(favicon=f"data:image/png;base64,{icon}")

    result = ExportService(tmp_path / "exports").export(payload)

    with ZipFile(result.archive_path) as archive:
        assert archive.read("assets/favicon.png") == b"icon-bytes"
        assert "assets/favicon.png" in archive.read("index.html").decode("utf-8")


@pytest.mark.parametrize("value", ["../escape", "folder/name", "", " leading-space"])
def test_export_payload_rejects_unsafe_filename(value: str) -> None:
    with pytest.raises(ValidationError, match="unsafe export filename"):
        make_payload(export_filename=value)


def test_export_payload_rejects_remote_favicon() -> None:
    with pytest.raises(ValidationError, match="allowlisted image data URL"):
        make_payload(favicon="https://example.test/favicon.png")
