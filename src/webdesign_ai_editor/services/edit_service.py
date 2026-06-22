from __future__ import annotations

from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan
from webdesign_ai_editor.domain.ports import AIProvider


class AIEditService:
    def __init__(self, provider: AIProvider) -> None:
        self._provider = provider

    async def plan(self, request: AIEditRequest) -> EditPlan:
        return await self._provider.create_edit_plan(request)
