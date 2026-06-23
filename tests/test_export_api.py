from __future__ import annotations

import asyncio
from pathlib import Path
from uuid import UUID

import httpx
import pytest

from webdesign_ai_editor.api.app import create_app
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class NoopProvider:
    async def create_edit_plan(self, request: AIEditRequest) -> EditPlan:
        del request
        await asyncio.sleep(0)
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
async def test_export_endpoint_writes_package_to_local_data_dir(tmp_path: Path) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        ai_provider=NoopProvider(),
        patch_repository=MemoryRepository(),
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.post(
            "/api/v1/exports",
            json={
                "export_filename": "api-export",
                "project_name": "API Export",
                "page_title": "API Export",
                "description": "API test",
                "source_url": "http://127.0.0.1:4173",
                "html": (
                    "<!doctype html><html><head></head>"
                    "<body>API</body></html>"
                ),
                "css": "body { margin: 0; }",
                "favicon": "",
                "warnings": [],
            },
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["files"] == [
        "REPORT.md",
        "index.html",
        "metadata.json",
        "styles.css",
    ]
    assert Path(payload["archive_path"]).is_file()
