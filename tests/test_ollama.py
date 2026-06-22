from __future__ import annotations

import json

import httpx
import pytest

from tests.conftest import make_element_context
from webdesign_ai_editor.adapters.ollama import OllamaClient, OllamaError
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest


def make_request() -> AIEditRequest:
    return AIEditRequest(prompt="Aumente o título", context=make_element_context())


@pytest.mark.asyncio
async def test_ollama_returns_valid_structured_plan(tmp_path) -> None:  # type: ignore[no-untyped-def]
    captured: dict[str, object] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured.update(json.loads(request.content))
        return httpx.Response(
            200,
            json={
                "response": json.dumps(
                    {
                        "summary": "Título aumentado",
                        "actions": [
                            {
                                "type": "set_style",
                                "property": "fontSize",
                                "value": "48px",
                            }
                        ],
                        "warnings": [],
                    }
                )
            },
        )

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://ollama.test",
    ) as client:
        settings = Settings(data_dir=tmp_path, ollama_model="gemma4")
        plan = await OllamaClient(settings, client=client).create_edit_plan(make_request())

    assert plan.actions[0].type == "set_style"
    assert captured["model"] == "gemma4"
    assert captured["stream"] is False
    assert isinstance(captured["format"], dict)


@pytest.mark.asyncio
async def test_ollama_rejects_invalid_model_output(tmp_path) -> None:  # type: ignore[no-untyped-def]
    def handler(request: httpx.Request) -> httpx.Response:
        del request
        return httpx.Response(200, json={"response": '{"summary":"x","actions":[]}'})

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://ollama.test",
    ) as client:
        settings = Settings(data_dir=tmp_path)
        with pytest.raises(OllamaError, match="não passou na validação"):
            await OllamaClient(settings, client=client).create_edit_plan(make_request())


@pytest.mark.asyncio
async def test_ollama_lists_models(tmp_path) -> None:  # type: ignore[no-untyped-def]
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path == "/api/tags"
        return httpx.Response(200, json={"models": [{"name": "gemma4:latest"}]})

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler),
        base_url="http://ollama.test",
    ) as client:
        settings = Settings(data_dir=tmp_path)
        models = await OllamaClient(settings, client=client).list_models()

    assert models == ["gemma4:latest"]
