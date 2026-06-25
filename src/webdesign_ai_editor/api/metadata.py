from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from webdesign_ai_editor.adapters.project_metadata_repository import (
    ProjectMetadataRepository,
)
from webdesign_ai_editor.domain.project_metadata import ProjectMetadata


def create_metadata_router(repository: ProjectMetadataRepository) -> APIRouter:
    router = APIRouter(prefix="/api/v1/metadata", tags=["metadata"])

    @router.get("/{session_id}", response_model=ProjectMetadata)
    async def get_metadata(session_id: UUID) -> ProjectMetadata:
        return repository.get(session_id)

    @router.put("/{session_id}", response_model=ProjectMetadata)
    async def save_metadata(
        session_id: UUID,
        metadata: ProjectMetadata,
    ) -> ProjectMetadata:
        if metadata.session_id != session_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="metadata session must match the path session",
            )
        return repository.save(metadata)

    @router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def delete_metadata(session_id: UUID) -> Response:
        repository.delete(session_id)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
