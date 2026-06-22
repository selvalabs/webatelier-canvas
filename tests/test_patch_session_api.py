from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

import httpx
import pytest

from tests.test_api import FakeProvider, MemoryRepository
from webdesign_ai_editor.api.app import create_app
from webdesign_ai_editor.config import Settings


def patch_payload(session_id: UUID, after: str) -> dict[str, str]:
    return {
        "session_id": str(session_id),
        "url": "http://127.0.0.1:3000",
        "selector": "#hero-title",
        "source": "manual",
        "action": "set_style",
        "property": "fontSize",
        "before": "40px",
        "after": after,
    }


@pytest.mark.asyncio
async def test_replace_and_clear_session(tmp_path: Path) -> None:
    repository = MemoryRepository()
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        ai_provider=FakeProvider(),
        patch_repository=repository,
    )
    session_id = uuid4()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        replaced = await client.put(
            f"/api/v1/patches/{session_id}",
            json=[patch_payload(session_id, "52px")],
        )
        cleared = await client.delete(f"/api/v1/patches/{session_id}")
        listed = await client.get(f"/api/v1/patches/{session_id}")

    assert replaced.status_code == 200
    assert replaced.json()[0]["after"] == "52px"
    assert cleared.status_code == 204
    assert listed.json() == []


@pytest.mark.asyncio
async def test_replace_rejects_other_session(tmp_path: Path) -> None:
    app = create_app(
        settings=Settings(data_dir=tmp_path),
        ai_provider=FakeProvider(),
        patch_repository=MemoryRepository(),
    )
    path_session = uuid4()

    async with httpx.AsyncClient(
        transport=httpx.ASGITransport(app=app),
        base_url="http://test",
    ) as client:
        response = await client.put(
            f"/api/v1/patches/{path_session}",
            json=[patch_payload(uuid4(), "52px")],
        )

    assert response.status_code == 422
