from __future__ import annotations

import json
from pathlib import Path
from uuid import uuid4

import pytest
from pydantic import ValidationError

from webdesign_ai_editor.adapters.json_project_repository import JsonProjectRepository
from webdesign_ai_editor.domain.projects import ProjectCreate, ProjectUpdate
from webdesign_ai_editor.services.projects import ProjectService, detect_framework


def test_project_create_requires_loopback_url(tmp_path: Path) -> None:
    with pytest.raises(ValidationError, match="loopback"):
        ProjectCreate(
            name="Remote",
            root_path=str(tmp_path),
            local_url="https://example.test",
        )


def test_framework_detection_is_static_and_non_executing(tmp_path: Path) -> None:
    (tmp_path / "index.html").write_text("<h1>Static</h1>", encoding="utf-8")
    assert detect_framework(tmp_path) == "static"

    (tmp_path / "package.json").write_text(
        json.dumps({"dependencies": {"vite": "latest", "react": "latest"}}),
        encoding="utf-8",
    )
    assert detect_framework(tmp_path) == "react"


def test_project_service_round_trip_and_project_scoped_sessions(tmp_path: Path) -> None:
    root = tmp_path / "site"
    root.mkdir()
    (root / "vite.config.ts").write_text("export default {}", encoding="utf-8")
    repository = JsonProjectRepository(tmp_path / "data" / "projects")
    service = ProjectService(repository)

    created = service.create(
        ProjectCreate(
            name="Local site",
            root_path=str(root),
            local_url="http://127.0.0.1:5173/",
        )
    )
    session_id = uuid4()
    attached = service.attach_session(created.id, session_id)

    assert created.framework_hint == "vite"
    assert created.local_url == "http://127.0.0.1:5173"
    assert attached.session_ids == [session_id]
    assert service.get(created.id).session_ids == [session_id]
    assert repository.sessions_dir(created.id).is_dir()
    assert repository.exports_dir(created.id).is_dir()


def test_project_service_updates_root_and_preserves_workspace(tmp_path: Path) -> None:
    first = tmp_path / "first"
    second = tmp_path / "second"
    first.mkdir()
    second.mkdir()
    (first / "index.html").write_text("first", encoding="utf-8")
    (second / "package.json").write_text(
        json.dumps({"dependencies": {"vue": "latest"}}),
        encoding="utf-8",
    )
    repository = JsonProjectRepository(tmp_path / "data" / "projects")
    service = ProjectService(repository)
    created = service.create(
        ProjectCreate(
            name="Project",
            root_path=str(first),
            local_url="http://localhost:3000",
        )
    )
    workspace = repository.workspace_dir(created.id)

    updated = service.update(
        created.id,
        ProjectUpdate(name="Renamed", root_path=str(second)),
    )
    removed = service.remove(created.id)

    assert updated.name == "Renamed"
    assert updated.framework_hint == "vue"
    assert removed is True
    assert workspace.is_dir()
