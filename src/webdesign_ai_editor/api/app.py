from __future__ import annotations

from uuid import UUID

from fastapi import FastAPI, HTTPException, Response, status

from webdesign_ai_editor.adapters.jsonl_patch_repository import JsonlPatchRepository
from webdesign_ai_editor.adapters.ollama import OllamaClient, OllamaError
from webdesign_ai_editor.config import Settings
from webdesign_ai_editor.domain.export_models import ExportPayload, ExportResult
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord
from webdesign_ai_editor.domain.ports import AIProvider, PatchRepository
from webdesign_ai_editor.services.edit_service import AIEditService
from webdesign_ai_editor.services.exporter import ExportService


def create_app(
    *,
    settings: Settings | None = None,
    ai_provider: AIProvider | None = None,
    patch_repository: PatchRepository | None = None,
) -> FastAPI:
    resolved_settings = settings or Settings()
    resolved_provider = ai_provider or OllamaClient(resolved_settings)
    resolved_repository = patch_repository or JsonlPatchRepository(
        resolved_settings.sessions_dir
    )
    edit_service = AIEditService(resolved_provider)
    export_service = ExportService(resolved_settings.data_dir / "exports")

    app = FastAPI(
        title="WebDesign AI Editor API",
        version="0.1.0",
        description="Local-first API. Remote deployment requires additional security controls.",
    )

    @app.get("/health")
    async def health() -> dict[str, str]:
        return {
            "status": "ok",
            "mode": "local-first",
            "model": resolved_settings.ollama_model,
        }

    @app.post("/api/v1/ai/edits", response_model=EditPlan)
    async def create_edit(request: AIEditRequest) -> EditPlan:
        try:
            return await edit_service.plan(request)
        except OllamaError as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=str(exc),
            ) from exc

    @app.post("/api/v1/patches", status_code=status.HTTP_201_CREATED)
    async def append_patch(record: PatchRecord) -> dict[str, str]:
        resolved_repository.append(record)
        return {"id": str(record.id)}

    @app.get("/api/v1/patches/{session_id}", response_model=list[PatchRecord])
    async def list_patches(session_id: UUID) -> list[PatchRecord]:
        return resolved_repository.list_by_session(session_id)

    @app.put("/api/v1/patches/{session_id}", response_model=list[PatchRecord])
    async def replace_patches(
        session_id: UUID,
        records: list[PatchRecord],
    ) -> list[PatchRecord]:
        if any(record.session_id != session_id for record in records):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="every patch must belong to the path session",
            )
        resolved_repository.replace_session(session_id, records)
        return records

    @app.delete(
        "/api/v1/patches/{session_id}",
        status_code=status.HTTP_204_NO_CONTENT,
        response_class=Response,
    )
    async def clear_patches(session_id: UUID) -> Response:
        resolved_repository.clear_session(session_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    @app.post("/api/v1/exports", response_model=ExportResult)
    async def create_export(request: ExportPayload) -> ExportResult:
        try:
            return export_service.export(request)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

    return app


app = create_app()
