from __future__ import annotations

from uuid import uuid4

from webdesign_ai_editor.adapters.browser_host import BrowserEditorHost
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class NullRepository:
    def append(self, record: PatchRecord) -> None:
        del record

    def list_by_session(self, session_id):  # type: ignore[no-untyped-def]
        del session_id
        return []


class NullService:
    async def plan(self, request: AIEditRequest) -> EditPlan:
        del request
        raise AssertionError("not called")


def test_runtime_bundle_is_packaged() -> None:
    host = BrowserEditorHost(
        session_id=uuid4(),
        patch_repository=NullRepository(),
        edit_service=NullService(),  # type: ignore[arg-type]
    )

    assert host.runtime_path.is_file()
    assert host.runtime_path.name == "editor-runtime.js"
