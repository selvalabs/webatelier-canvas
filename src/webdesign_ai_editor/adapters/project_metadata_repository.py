from __future__ import annotations

import threading
from pathlib import Path
from uuid import UUID

from webdesign_ai_editor.domain.project_metadata import ProjectMetadata


class ProjectMetadataRepository:
    """Local JSON storage for project identity, scoped by editing session."""

    def __init__(self, metadata_dir: Path) -> None:
        self._metadata_dir = metadata_dir
        self._metadata_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def get(self, session_id: UUID) -> ProjectMetadata:
        path = self._path_for(session_id)
        if not path.is_file():
            return ProjectMetadata(session_id=session_id)
        with self._lock:
            return ProjectMetadata.model_validate_json(path.read_text(encoding="utf-8"))

    def save(self, metadata: ProjectMetadata) -> ProjectMetadata:
        path = self._path_for(metadata.session_id)
        temporary = path.with_suffix(".json.tmp")
        payload = metadata.model_dump_json(indent=2) + "\n"
        with self._lock:
            temporary.write_text(payload, encoding="utf-8")
            temporary.replace(path)
        return metadata

    def delete(self, session_id: UUID) -> bool:
        path = self._path_for(session_id)
        with self._lock:
            existed = path.is_file()
            path.unlink(missing_ok=True)
        return existed

    def _path_for(self, session_id: UUID) -> Path:
        return self._metadata_dir / f"{session_id}.json"
