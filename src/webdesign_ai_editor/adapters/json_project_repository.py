from __future__ import annotations

import threading
from pathlib import Path
from uuid import UUID

from webdesign_ai_editor.domain.projects import ProjectProfile


class JsonProjectRepository:
    def __init__(self, projects_dir: Path) -> None:
        self._profiles_dir = projects_dir / "profiles"
        self._workspaces_dir = projects_dir / "workspaces"
        self._profiles_dir.mkdir(parents=True, exist_ok=True)
        self._workspaces_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def list(self) -> list[ProjectProfile]:
        profiles: list[ProjectProfile] = []
        with self._lock:
            paths = sorted(self._profiles_dir.glob("*.json"))
            for path in paths:
                profiles.append(
                    ProjectProfile.model_validate_json(path.read_text(encoding="utf-8"))
                )
        return sorted(profiles, key=lambda item: item.updated_at, reverse=True)

    def get(self, project_id: UUID) -> ProjectProfile | None:
        path = self._path_for(project_id)
        if not path.is_file():
            return None
        with self._lock:
            return ProjectProfile.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, profile: ProjectProfile) -> ProjectProfile:
        path = self._path_for(profile.id)
        temporary = path.with_suffix(".json.tmp")
        payload = profile.model_dump_json(indent=2) + "\n"
        with self._lock:
            temporary.write_text(payload, encoding="utf-8")
            temporary.replace(path)
            self.workspace_dir(profile.id).mkdir(parents=True, exist_ok=True)
        return profile

    def delete(self, project_id: UUID) -> bool:
        path = self._path_for(project_id)
        with self._lock:
            existed = path.is_file()
            path.unlink(missing_ok=True)
        return existed

    def workspace_dir(self, project_id: UUID) -> Path:
        return self._workspaces_dir / str(project_id)

    def sessions_dir(self, project_id: UUID) -> Path:
        path = self.workspace_dir(project_id) / "sessions"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def exports_dir(self, project_id: UUID) -> Path:
        path = self.workspace_dir(project_id) / "exports"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _path_for(self, project_id: UUID) -> Path:
        return self._profiles_dir / f"{project_id}.json"
