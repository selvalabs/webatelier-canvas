from __future__ import annotations

import json
from uuid import uuid4

import pytest

from webdesign_ai_editor.adapters.jsonl_patch_repository import JsonlPatchRepository
from webdesign_ai_editor.domain.models import PatchEvent, PatchRecord


def make_record(session_id):  # type: ignore[no-untyped-def]
    event = PatchEvent(
        selector="#hero-title",
        source="manual",
        action="set_style",
        property="fontSize",
        before="40px",
        after="48px",
    )
    return PatchRecord.from_event(
        session_id=session_id,
        url="http://127.0.0.1:3000",
        event=event,
    )


def test_repository_round_trip_and_export(tmp_path) -> None:  # type: ignore[no-untyped-def]
    repository = JsonlPatchRepository(tmp_path / "sessions")
    session_id = uuid4()
    record = make_record(session_id)

    repository.append(record)
    loaded = repository.list_by_session(session_id)
    destination = repository.export_session(session_id, tmp_path / "export.json")

    assert loaded == [record]
    payload = json.loads(destination.read_text(encoding="utf-8"))
    assert payload[0]["selector"] == "#hero-title"


def test_repository_reports_corrupted_line(tmp_path) -> None:  # type: ignore[no-untyped-def]
    repository = JsonlPatchRepository(tmp_path)
    session_id = uuid4()
    (tmp_path / f"{session_id}.jsonl").write_text("not-json\n", encoding="utf-8")

    with pytest.raises(ValueError, match="Invalid patch record"):
        repository.list_by_session(session_id)
