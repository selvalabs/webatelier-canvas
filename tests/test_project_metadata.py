from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest
from pydantic import ValidationError

from webdesign_ai_editor.adapters.project_metadata_repository import (
    ProjectMetadataRepository,
)
from webdesign_ai_editor.api.app import create_app
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord
from webdesign_ai_editor.domain.project_metadata import ProjectMetadata


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


class MemoryPatchRepository:
    def append(self, record: PatchRecord) -> None:
        del record

    def list_by_session(self, session_id: UUID) -> list[PatchRecord]:
        del session_id
        return []

    def replace_session(self, session_id: UUID, records: list[PatchRecord]) -> None:
        del session_id, records

    def clear_session(self, session_id: UUID) -> None:
        del session_id


def test_metadata_repository_round_trip_and_delete(tmp_path: Path) -> None:
    repository = ProjectMetadataRepository(tmp_path / "metadata")
    session_id = uuid4()
    initial = repository.get(session_id)
    saved = repository.save(
        initial.model_copy(
            update={
                "project_name": "Landing page",
                "page_title": "Produto",
                "export_filename": "produto-landing",
            }
        )
    )

    assert initial.session_id == session_id
    assert initial.project_name == "Untitled project"
    assert repository.get(session_id) == saved
    assert repository.delete(session_id) is True
    assert repository.get(session_id).project_name == "Untitled project"


@pytest.mark.parametrize("value", ["../escape", "folder/name", "", "bad name"])
def test_metadata_rejects_unsafe_export_filename(value: str) -> None:
    with pytest.raises(ValidationError):
        ProjectMetadata(session_id=uuid4(), export_filename=value)


@pytest.mark.parametrize(
    "value",
    ["javascript:alert(1)", "file:///tmp/favicon.ico", "data:text/html;base64,PHNjcmlwdD4="],
)
def test_metadata_rejects_unsafe_favicon(value: str) -> None:
    with pytest.raises(ValidationError):
        ProjectMetadata(session_id=uuid4(), favicon=value)


@pytest.mark.asyncio
async def test_metadata_api_round_trip(tmp_path: Path) -> None:
    session_id = uuid4()
    settings = Settings(data_dir=tmp_path)
    repository = ProjectMetadataRepository(settings.metadata_dir)
    app = create_app(
        settings=settings,
        ai_provider=NoopProvider(),
        patch_repository=MemoryPatchRepository(),
        metadata_repository=repository,
    )
    payload = ProjectMetadata(
        session_id=session_id,
        project_name="WebAtelier Demo",
        page_title="Demo",
        description="Local project metadata",
        export_filename="webatelier-demo",
        favicon="https://example.test/favicon.png",
    ).model_dump(mode="json")

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        default = await client.get(f"/api/v1/metadata/{session_id}")
        saved = await client.put(f"/api/v1/metadata/{session_id}", json=payload)
        loaded = await client.get(f"/api/v1/metadata/{session_id}")
        deleted = await client.delete(f"/api/v1/metadata/{session_id}")

    assert default.status_code == 200
    assert default.json()["project_name"] == "Untitled project"
    assert saved.status_code == 200
    assert loaded.json()["export_filename"] == "webatelier-demo"
    assert deleted.status_code == 204


@pytest.mark.asyncio
async def test_metadata_api_rejects_session_mismatch(tmp_path: Path) -> None:
    path_session = uuid4()
    payload = ProjectMetadata(session_id=uuid4()).model_dump(mode="json")
    settings = Settings(data_dir=tmp_path)
    app = create_app(
        settings=settings,
        ai_provider=NoopProvider(),
        patch_repository=MemoryPatchRepository(),
        metadata_repository=ProjectMetadataRepository(settings.metadata_dir),
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.put(
            f"/api/v1/metadata/{path_session}",
            json=payload,
        )

    assert response.status_code == 422
