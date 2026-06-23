from __future__ import annotations

import re
from urllib.parse import urlparse
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

_SAFE_FILENAME = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,119}$")
_ALLOWED_DATA_PREFIXES = (
    "data:image/png;base64,",
    "data:image/jpeg;base64,",
    "data:image/webp;base64,",
    "data:image/x-icon;base64,",
    "data:image/vnd.microsoft.icon;base64,",
)


class ProjectMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    session_id: UUID
    project_name: str = Field(default="Untitled project", min_length=1, max_length=120)
    page_title: str = Field(default="", max_length=160)
    description: str = Field(default="", max_length=500)
    export_filename: str = Field(default="webatelier-export", min_length=1, max_length=120)
    favicon: str = Field(default="", max_length=700_000)

    @field_validator("export_filename")
    @classmethod
    def validate_export_filename(cls, value: str) -> str:
        if not _SAFE_FILENAME.fullmatch(value):
            raise ValueError(
                "export filename must start with a letter or number and contain only letters, "
                "numbers, dots, underscores or hyphens"
            )
        if value in {".", ".."}:
            raise ValueError("export filename cannot be a relative path")
        return value

    @field_validator("favicon")
    @classmethod
    def validate_favicon(cls, value: str) -> str:
        if not value:
            return value
        lowered = value.casefold()
        if lowered.startswith(_ALLOWED_DATA_PREFIXES):
            return value
        parsed = urlparse(value)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("favicon must use http(s) or an allowlisted image data URL")
        if parsed.username or parsed.password:
            raise ValueError("favicon URL cannot contain credentials")
        return value
