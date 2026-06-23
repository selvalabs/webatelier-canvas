from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest

from webdesign_ai_editor.api.app import create_app
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class NoopProvider:
    async def create_edit_plan(self, request: AIEditRequest) -> EditPlan:
        del request
        return EditPlan.model_validate(
            {
                "summary": "No-op",
                "actions": [{"type": "set_text", "value": "No-op"}],
                "warnings": [],
            }
        )


class MemoryRepository:
    def append(self, record: PatchRecord) -> None:
        del record

    def list_by_session(self, session_id: UUID) -> list[PatchRecord]:
        del session_id
        return []

    def replace_session(self, session_id: UUID, records: list[PatchRecord]) -> None:
        del session_id, records

    def clear_session(self, session_id: UUID) -> None:
        del session_id


@pytest.mark.asyncio
async def test_project_api_crud_and_session_association(tmp_path: Path) -> None:
    root = tmp_path / "site"
    root.mkdir()
    (root / "index.html").write_text("<h1>Site</h1>", encoding="utf-8")
    app = create_app(
        settings=Settings(data_dir=tmp_path / "data"),
        ai_provider=NoopProvider(),
        patch_repository=MemoryRepository(),
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        created = await client.post(
            "/api/v1/projects",
            json={
                "name": "Local site",
                "root_path": str(root),
                "local_url": "http://127.0.0.1:4173",
                "framework_hint": "unknown",
            },
        )
        project_id = created.json()["id"]
        listed = await client.get("/api/v1/projects")
        updated = await client.patch(
            f"/api/v1/projects/{project_id}",
            json={"name": "Renamed site"},
        )
        session_id = uuid4()
        attached = await client.post(
            f"/api/v1/projects/{project_id}/sessions/{session_id}"
        )
        workspace = await client.get(f"/api/v1/projects/{project_id}/workspace")
        removed = await client.delete(f"/api/v1/projects/{project_id}")
        missing = await client.get(f"/api/v1/projects/{project_id}")

    assert created.status_code == 201
    assert created.json()["framework_hint"] == "static"
    assert listed.json()[0]["id"] == project_id
    assert updated.json()["name"] == "Renamed site"
    assert attached.json()["session_ids"] == [str(session_id)]
    assert Path(workspace.json()["sessions"]).is_dir()
    assert removed.status_code == 204
    assert missing.status_code == 404
