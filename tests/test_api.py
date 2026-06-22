from __future__ import annotations

from uuid import uuid4

import httpx
import pytest

from tests.conftest import make_element_context
from webdesign_ai_editor.api.app import create_app
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class FakeProvider:
    async def create_edit_plan(self, request: AIEditRequest) -> EditPlan:
        return EditPlan.model_validate(
            {
                "summary": f"Plano para: {request.prompt}",
                "actions": [
                    {"type": "set_style", "property": "fontSize", "value": "48px"}
                ],
                "warnings": [],
            }
        )


class MemoryRepository:
    def __init__(self) -> None:
        self.records: list[PatchRecord] = []

    def append(self, record: PatchRecord) -> None:
        self.records.append(record)

    def list_by_session(self, session_id):  # type: ignore[no-untyped-def]
        return [record for record in self.records if record.session_id == session_id]


@pytest.mark.asyncio
async def test_health_and_edit_contract(tmp_path) -> None:  # type: ignore[no-untyped-def]
    app = create_app(
        settings=Settings(data_dir=tmp_path, ollama_model="gemma4"),
        ai_provider=FakeProvider(),
        patch_repository=MemoryRepository(),
    )

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        health = await client.get("/health")
        edit = await client.post(
            "/api/v1/ai/edits",
            json={
                "prompt": "Aumente",
                "context": make_element_context().model_dump(mode="json"),
            },
        )

    assert health.json()["mode"] == "local-first"
    assert edit.status_code == 200
    assert edit.json()["actions"][0]["property"] == "fontSize"


@pytest.mark.asyncio
async def test_patch_endpoints_round_trip(tmp_path) -> None:  # type: ignore[no-untyped-def]
    repository = MemoryRepository()
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        ai_provider=FakeProvider(),
        patch_repository=repository,
    )
    session_id = uuid4()
    payload = {
        "session_id": str(session_id),
        "url": "http://127.0.0.1:3000",
        "selector": "#hero-title",
        "source": "manual",
        "action": "set_style",
        "property": "fontSize",
        "before": "40px",
        "after": "48px",
    }

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        created = await client.post("/api/v1/patches", json=payload)
        listed = await client.get(f"/api/v1/patches/{session_id}")

    assert created.status_code == 201
    assert listed.status_code == 200
    assert listed.json()[0]["after"] == "48px"
