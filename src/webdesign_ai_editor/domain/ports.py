from __future__ import annotations

from typing import Protocol
from uuid import UUID

from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class AIProvider(Protocol):
    async def create_edit_plan(self, request: AIEditRequest) -> EditPlan:
        """Create a validated edit plan from an element context and user prompt."""


class PatchRepository(Protocol):
    def append(self, record: PatchRecord) -> None:
        """Persist one patch record."""

    def list_by_session(self, session_id: UUID) -> list[PatchRecord]:
        """Return records for a session in append order."""

    def replace_session(self, session_id: UUID, records: list[PatchRecord]) -> None:
        """Atomically replace one session with validated records."""

    def clear_session(self, session_id: UUID) -> None:
        """Remove all records for one session."""
