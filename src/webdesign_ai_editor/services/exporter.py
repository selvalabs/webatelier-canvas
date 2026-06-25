from __future__ import annotations

import base64
import json
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

from webdesign_ai_editor.domain.export_models import ExportPayload, ExportResult

_FIXED_ZIP_TIME = (2026, 1, 1, 0, 0, 0)
_FAVICON_TYPES = {
    "data:image/png;base64,": "png",
    "data:image/jpeg;base64,": "jpg",
    "data:image/webp;base64,": "webp",
    "data:image/x-icon;base64,": "ico",
    "data:image/vnd.microsoft.icon;base64,": "ico",
}


class ExportService:
    def __init__(self, exports_dir: Path) -> None:
        self._exports_dir = exports_dir
        self._exports_dir.mkdir(parents=True, exist_ok=True)

    def export(self, payload: ExportPayload) -> ExportResult:
        files, warnings = self._build_files(payload)
        destination = self._exports_dir / f"{payload.export_filename}.zip"
        temporary = destination.with_suffix(".zip.tmp")

        with ZipFile(temporary, "w", compression=ZIP_DEFLATED, compresslevel=9) as archive:
            for name in sorted(files):
                self._write_entry(archive, name, files[name])
        temporary.replace(destination)

        return ExportResult(
            archive_path=destination,
            files=sorted(files),
            warnings=warnings,
        )

    def _build_files(self, payload: ExportPayload) -> tuple[dict[str, bytes], list[str]]:
        warnings = list(dict.fromkeys(payload.warnings))
        html = payload.html
        files: dict[str, bytes] = {
            "styles.css": self._text_bytes(payload.css),
        }

        if payload.favicon:
            favicon_name, favicon_bytes = self._decode_favicon(payload.favicon)
            files[favicon_name] = favicon_bytes
            html = html.replace("__WDA_FAVICON_PATH__", favicon_name)
        else:
            html = html.replace("__WDA_FAVICON_PATH__", "")

        metadata = {
            "description": payload.description,
            "export_filename": payload.export_filename,
            "page_title": payload.page_title,
            "project_name": payload.project_name,
            "source_url": payload.source_url,
        }
        files["index.html"] = self._text_bytes(html)
        files["metadata.json"] = self._text_bytes(
            json.dumps(metadata, ensure_ascii=False, indent=2, sort_keys=True)
        )
        files["REPORT.md"] = self._text_bytes(self._report(payload, sorted(files), warnings))
        return files, warnings

    @staticmethod
    def _decode_favicon(value: str) -> tuple[str, bytes]:
        lowered = value.casefold()
        for prefix, extension in _FAVICON_TYPES.items():
            if lowered.startswith(prefix):
                encoded = value[len(prefix) :]
                try:
                    raw = base64.b64decode(encoded, validate=True)
                except ValueError as exc:
                    raise ValueError("favicon data URL contains invalid base64") from exc
                if len(raw) > 512 * 1024:
                    raise ValueError("favicon exceeds the 512 KB export limit")
                return f"assets/favicon.{extension}", raw
        raise ValueError("unsupported favicon data URL")

    @staticmethod
    def _report(payload: ExportPayload, files: list[str], warnings: list[str]) -> str:
        file_lines = "\n".join(f"- `{name}`" for name in files)
        warning_lines = "\n".join(f"- {warning}" for warning in warnings) or "- None"
        return (
            f"# Export report: {payload.project_name}\n\n"
            f"Source: `{payload.source_url or 'local snapshot'}`\n\n"
            "## Files\n\n"
            f"{file_lines}\n\n"
            "## Warnings\n\n"
            f"{warning_lines}\n"
        )

    @staticmethod
    def _text_bytes(value: str) -> bytes:
        return (value.rstrip() + "\n").encode("utf-8")

    @staticmethod
    def _write_entry(archive: ZipFile, name: str, data: bytes) -> None:
        info = ZipInfo(name, date_time=_FIXED_ZIP_TIME)
        info.compress_type = ZIP_DEFLATED
        info.external_attr = 0o100644 << 16
        archive.writestr(info, data)
