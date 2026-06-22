from __future__ import annotations

import json
from pathlib import Path
from uuid import UUID, uuid4

import pytest

from webdesign_ai_editor.adapters.jsonl_patch_repository import JsonlPatchRepository
from webdesign_ai_editor.domain.models import PatchEvent, PatchRecord


def make_record(session_id: UUID, *, after: str = "48px") -> PatchRecord:
    event = PatchEvent(
        selector="#hero-title",
        source="manual",
        action="set_style",
        property="fontSize",
        before="40px",
        after=after,
    )
    return PatchRecord.from_event(
        session_id=session_id,
        url="http://127.0.0.1:3000",
        event=event,
    )


def test_repository_round_trip_and_export(tmp_path: Path) -> None:
    repository = JsonlPatchRepository(tmp_path / "sessions")
    session_id = uuid4()
    record = make_record(session_id)

    repository.append(record)
    loaded = repository.list_by_session(session_id)
    destination = repository.export_session(session_id, tmp_path / "export.json")

    assert loaded == [record]
    payload = json.loads(destination.read_text(encoding="utf-8"))
    assert payload[0]["selector"] == "#hero-title"


def test_repository_replaces_and_clears_session(tmp_path: Path) -> None:
    repository = JsonlPatchRepository(tmp_path / "sessions")
    session_id = uuid4()
    first = make_record(session_id)
    replacement = make_record(session_id, after="52px")

    repository.append(first)
    repository.replace_session(session_id, [replacement])

    assert repository.list_by_session(session_id) == [replacement]

    repository.clear_session(session_id)
    assert repository.list_by_session(session_id) == []


def test_repository_rejects_cross_session_replace(tmp_path: Path) -> None:
    repository = JsonlPatchRepository(tmp_path / "sessions")

    with pytest.raises(ValueError, match="target session"):
        repository.replace_session(uuid4(), [make_record(uuid4())])


def test_repository_reports_corrupted_line(tmp_path: Path) -> None:
    repository = JsonlPatchRepository(tmp_path)
    session_id = uuid4()
    (tmp_path / f"{session_id}.jsonl").write_text("not-json\n", encoding="utf-8")

    with pytest.raises(ValueError, match="Invalid patch record"):
        repository.list_by_session(session_id)
