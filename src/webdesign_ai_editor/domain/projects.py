from __future__ import annotations

import ipaddress
from datetime import UTC, datetime
from typing import Literal
from urllib.parse import urlparse
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator

FrameworkHint = Literal["static", "vite", "react", "vue", "svelte", "unknown"]


class StrictProjectModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ProjectCreate(StrictProjectModel):
    name: str = Field(min_length=1, max_length=120)
    root_path: str = Field(min_length=1, max_length=4096)
    local_url: str = Field(min_length=1, max_length=4096)
    framework_hint: FrameworkHint = "unknown"

    @field_validator("root_path")
    @classmethod
    def validate_root_path(cls, value: str) -> str:
        return validate_project_path(value)

    @field_validator("local_url")
    @classmethod
    def validate_local_url(cls, value: str) -> str:
        return validate_loopback_url(value)


class ProjectUpdate(StrictProjectModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    root_path: str | None = Field(default=None, min_length=1, max_length=4096)
    local_url: str | None = Field(default=None, min_length=1, max_length=4096)
    framework_hint: FrameworkHint | None = None

    @field_validator("root_path")
    @classmethod
    def validate_optional_root(cls, value: str | None) -> str | None:
        return validate_project_path(value) if value is not None else None

    @field_validator("local_url")
    @classmethod
    def validate_optional_url(cls, value: str | None) -> str | None:
        return validate_loopback_url(value) if value is not None else None


class ProjectProfile(StrictProjectModel):
    id: UUID = Field(default_factory=uuid4)
    name: str = Field(min_length=1, max_length=120)
    root_path: str = Field(min_length=1, max_length=4096)
    local_url: str = Field(min_length=1, max_length=4096)
    framework_hint: FrameworkHint = "unknown"
    metadata_key: str = Field(min_length=1, max_length=120)
    session_ids: list[UUID] = Field(default_factory=list, max_length=500)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @field_validator("root_path")
    @classmethod
    def validate_stored_root(cls, value: str) -> str:
        return validate_project_path(value)

    @field_validator("local_url")
    @classmethod
    def validate_stored_url(cls, value: str) -> str:
        return validate_loopback_url(value)


def validate_project_path(value: str) -> str:
    if "\x00" in value:
        raise ValueError("project path cannot contain a null byte")
    return value


def validate_loopback_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("project URL must be a complete http(s) URL")
    if parsed.username or parsed.password:
        raise ValueError("project URL cannot contain credentials")
    host = parsed.hostname.casefold()
    try:
        loopback = ipaddress.ip_address(host).is_loopback
    except ValueError:
        loopback = host == "localhost"
    if not loopback:
        raise ValueError("project URL must use a loopback host")
    return value.rstrip("/")
