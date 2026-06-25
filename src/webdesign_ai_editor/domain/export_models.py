from __future__ import annotations

import re
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, field_validator

_SAFE_FILENAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
_ALLOWED_FAVICON_PREFIXES = (
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/webp;base64,",
    "data:image/x-icon;base64,",
    "data:image/vnd.microsoft.icon;base64,",
)


class ExportPayload(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    export_filename: str = Field(default="webatelier-export", min_length=1, max_length=120)
    project_name: str = Field(default="Untitled project", min_length=1, max_length=120)
    page_title: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=500)
    source_url: str = Field(default="", max_length=4096)
    html: str = Field(min_length=1, max_length=8_000_000)
    css: str = Field(default="", max_length=2_000_000)
    favicon: str = Field(default="", max_length=700_000)
    warnings: list[str] = Field(default_factory=list, max_length=100)

    @field_validator("export_filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        if not _SAFE_FILENAME.fullmatch(value) or value in {".", ".."}:
            raise ValueError("unsafe export filename")
        return value

    @field_validator("favicon")
    @classmethod
    def validate_favicon(cls, value: str) -> str:
        if not value:
            return value
        if not value.casefold().startswith(_ALLOWED_FAVICON_PREFIXES):
            raise ValueError("exported favicon must be an allowlisted image data URL")
        return value


class ExportResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    archive_path: Path
    files: list[str]
    warnings: list[str]
