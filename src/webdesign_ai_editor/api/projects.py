from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, HTTPException, Response, status

from webdesign_ai_editor.domain.projects import (
    ProjectCreate,
    ProjectProfile,
    ProjectUpdate,
)
from webdesign_ai_editor.services.projects import (
    ProjectNotFoundError,
    ProjectService,
    ProjectValidationError,
)


def create_project_router(service: ProjectService) -> APIRouter:
    router = APIRouter(prefix="/api/v1/projects", tags=["projects"])

    @router.get("", response_model=list[ProjectProfile])
    async def list_projects() -> list[ProjectProfile]:
        return service.list()

    @router.post("", response_model=ProjectProfile, status_code=status.HTTP_201_CREATED)
    async def create_project(request: ProjectCreate) -> ProjectProfile:
        try:
            return service.create(request)
        except ProjectValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

    @router.get("/{project_id}", response_model=ProjectProfile)
    async def get_project(project_id: UUID) -> ProjectProfile:
        try:
            return service.get(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @router.patch("/{project_id}", response_model=ProjectProfile)
    async def update_project(
        project_id: UUID,
        request: ProjectUpdate,
    ) -> ProjectProfile:
        try:
            return service.update(project_id, request)
        except ProjectNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        except ProjectValidationError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail=str(exc),
            ) from exc

    @router.post("/{project_id}/sessions/{session_id}", response_model=ProjectProfile)
    async def attach_session(project_id: UUID, session_id: UUID) -> ProjectProfile:
        try:
            return service.attach_session(project_id, session_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @router.get("/{project_id}/workspace", response_model=dict[str, str])
    async def project_workspace(project_id: UUID) -> dict[str, str]:
        try:
            return service.workspace_info(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc

    @router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
    async def remove_project(project_id: UUID) -> Response:
        try:
            service.remove(project_id)
        except ProjectNotFoundError as exc:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(exc),
            ) from exc
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router
