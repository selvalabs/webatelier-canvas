from __future__ import annotations

from pathlib import Path
from uuid import UUID, uuid4

from webdesign_ai_editor.adapters.browser_host import BrowserEditorHost
from webdesign_ai_editor.domain.models import AIEditRequest, EditPlan, PatchRecord


class NullRepository:
    def append(self, record: PatchRecord) -> None:
        del record

    def list_by_session(self, session_id: UUID) -> list[PatchRecord]:
        del session_id
        return []

    def replace_session(self, session_id: UUID, records: list[PatchRecord]) -> None:
        del session_id, records

    def clear_session(self, session_id: UUID) -> None:
        del session_id


class NullService:
    async def plan(self, request: AIEditRequest) -> EditPlan:
        del request
        raise AssertionError("not called")


def build_host(*, exports_dir: Path | None = None) -> BrowserEditorHost:
    return BrowserEditorHost(
        session_id=uuid4(),
        patch_repository=NullRepository(),
        edit_service=NullService(),  # type: ignore[arg-type]
        exports_dir=exports_dir,
    )


def test_runtime_bundle_is_packaged() -> None:
    host = build_host()

    assert host.runtime_path.is_file()
    assert host.runtime_path.name == "editor-runtime.js"


def test_enhancement_runtime_is_packaged() -> None:
    host = build_host()

    assert host.enhancement_runtime_path.is_file()
    assert host.enhancement_runtime_path.name == "editor-enhancements.js"


def test_host_exposes_session_identifier() -> None:
    host = build_host()

    assert isinstance(host.session_id, UUID)


def test_host_accepts_custom_export_directory(tmp_path: Path) -> None:
    host = build_host(exports_dir=tmp_path / "project-exports")

    assert host.exports_dir == tmp_path / "project-exports"
