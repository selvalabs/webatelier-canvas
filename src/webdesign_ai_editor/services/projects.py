from __future__ import annotations

import json
from datetime import UTC, datetime
from pathlib import Path
from uuid import UUID

from webdesign_ai_editor.adapters.json_project_repository import JsonProjectRepository
from webdesign_ai_editor.domain.projects import (
    FrameworkHint,
    ProjectCreate,
    ProjectProfile,
    ProjectUpdate,
)


class ProjectNotFoundError(LookupError):
    pass


class ProjectValidationError(ValueError):
    pass


class ProjectService:
    def __init__(self, repository: JsonProjectRepository) -> None:
        self._repository = repository

    def list(self) -> list[ProjectProfile]:
        return self._repository.list()

    def get(self, project_id: UUID) -> ProjectProfile:
        profile = self._repository.get(project_id)
        if profile is None:
            raise ProjectNotFoundError(f"project not found: {project_id}")
        return profile

    def create(self, request: ProjectCreate) -> ProjectProfile:
        root = resolve_project_root(request.root_path)
        hint = request.framework_hint
        if hint == "unknown":
            hint = detect_framework(root)

        profile = ProjectProfile(
            name=request.name,
            root_path=str(root),
            local_url=request.local_url,
            framework_hint=hint,
            metadata_key="pending",
        )
        profile = profile.model_copy(update={"metadata_key": str(profile.id)})
        return self._repository.save(profile)

    def update(self, project_id: UUID, request: ProjectUpdate) -> ProjectProfile:
        current = self.get(project_id)
        values = request.model_dump(exclude_none=True)
        if "root_path" in values:
            root = resolve_project_root(str(values["root_path"]))
            values["root_path"] = str(root)
            if request.framework_hint is None:
                values["framework_hint"] = detect_framework(root)

        updated = current.model_copy(
            update={
                **values,
                "updated_at": datetime.now(UTC),
            }
        )
        return self._repository.save(updated)

    def attach_session(self, project_id: UUID, session_id: UUID) -> ProjectProfile:
        current = self.get(project_id)
        if session_id in current.session_ids:
            return current
        sessions = [*current.session_ids, session_id]
        updated = current.model_copy(
            update={
                "session_ids": sessions,
                "updated_at": datetime.now(UTC),
            }
        )
        self._repository.sessions_dir(project_id)
        return self._repository.save(updated)

    def remove(self, project_id: UUID) -> bool:
        self.get(project_id)
        return self._repository.delete(project_id)

    def workspace_info(self, project_id: UUID) -> dict[str, str]:
        self.get(project_id)
        return {
            "workspace": str(self._repository.workspace_dir(project_id)),
            "sessions": str(self._repository.sessions_dir(project_id)),
            "exports": str(self._repository.exports_dir(project_id)),
        }


def resolve_project_root(value: str) -> Path:
    path = Path(value).expanduser()
    try:
        resolved = path.resolve(strict=True)
    except OSError as exc:
        raise ProjectValidationError(f"project root does not exist: {path}") from exc
    if not resolved.is_dir():
        raise ProjectValidationError(f"project root is not a directory: {resolved}")
    return resolved


def detect_framework(root: Path) -> FrameworkHint:
    package = root / "package.json"
    package_names: set[str] = set()
    if package.is_file() and package.stat().st_size <= 2_000_000:
        try:
            payload = json.loads(package.read_text(encoding="utf-8"))
        except (OSError, UnicodeDecodeError, json.JSONDecodeError):
            payload = {}
        if isinstance(payload, dict):
            for key in ("dependencies", "devDependencies"):
                section = payload.get(key, {})
                if isinstance(section, dict):
                    package_names.update(str(name).casefold() for name in section)

    if "react" in package_names or "react-dom" in package_names:
        return "react"
    if "vue" in package_names:
        return "vue"
    if "svelte" in package_names:
        return "svelte"
    if "vite" in package_names or any(root.glob("vite.config.*")):
        return "vite"
    if (root / "index.html").is_file():
        return "static"
    return "unknown"
