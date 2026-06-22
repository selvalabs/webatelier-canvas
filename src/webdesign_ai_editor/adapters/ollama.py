from __future__ import annotations

from collections.abc import Sequence
from typing import Any

import httpx
from pydantic import ValidationError

from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan
from webdesign_ai_editor.services.prompting import SYSTEM_PROMPT, build_user_prompt


class OllamaError(RuntimeError):
    """Raised when the local Ollama service cannot produce a valid edit plan."""


class OllamaClient:
    def __init__(
        self,
        settings: Settings,
        *,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self._settings = settings
        self._external_client = client

    async def create_edit_plan(self, request: AIEditRequest) -> EditPlan:
        payload: dict[str, Any] = {
            "model": self._settings.ollama_model,
            "system": SYSTEM_PROMPT,
            "prompt": build_user_prompt(request),
            "stream": False,
            "think": False,
            "format": EditPlan.model_json_schema(),
            "options": {
                "temperature": 0.15,
                "num_predict": 1400,
            },
        }

        try:
            response = await self._post("/api/generate", json=payload)
            response.raise_for_status()
        except httpx.ConnectError as exc:
            raise OllamaError(
                "Não foi possível conectar ao Ollama. Confirme se ele está em execução em "
                f"{self._settings.ollama_base_url}."
            ) from exc
        except httpx.TimeoutException as exc:
            raise OllamaError("Ollama excedeu o tempo limite configurado.") from exc
        except httpx.HTTPStatusError as exc:
            detail = exc.response.text[:500]
            raise OllamaError(
                f"Ollama retornou HTTP {exc.response.status_code}: {detail}"
            ) from exc

        body = response.json()
        raw_plan = body.get("response")
        if not isinstance(raw_plan, str) or not raw_plan.strip():
            raise OllamaError("Ollama não retornou um campo 'response' válido.")

        try:
            return EditPlan.model_validate_json(raw_plan)
        except ValidationError as exc:
            raise OllamaError("O plano retornado pelo modelo não passou na validação.") from exc

    async def list_models(self) -> Sequence[str]:
        try:
            response = await self._get("/api/tags")
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise OllamaError("Não foi possível consultar os modelos do Ollama.") from exc

        payload = response.json()
        models = payload.get("models", [])
        result: list[str] = []
        for item in models:
            if not isinstance(item, dict):
                continue
            value = item.get("name") or item.get("model")
            if isinstance(value, str):
                result.append(value)
        return result

    async def _post(self, path: str, *, json: dict[str, Any]) -> httpx.Response:
        if self._external_client is not None:
            return await self._external_client.post(path, json=json)
        async with httpx.AsyncClient(
            base_url=self._settings.ollama_base_url,
            timeout=self._settings.ollama_timeout_seconds,
        ) as client:
            return await client.post(path, json=json)

    async def _get(self, path: str) -> httpx.Response:
        if self._external_client is not None:
            return await self._external_client.get(path)
        async with httpx.AsyncClient(
            base_url=self._settings.ollama_base_url,
            timeout=min(self._settings.ollama_timeout_seconds, 15.0),
        ) as client:
            return await client.get(path)
