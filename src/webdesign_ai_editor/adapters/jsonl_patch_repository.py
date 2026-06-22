from __future__ import annotations

import json
import threading
from pathlib import Path
from uuid import UUID

from webdesign_ai_editor.domain.models import PatchRecord


class JsonlPatchRepository:
    """Thread-safe local patch storage, one JSON object per line."""

    def __init__(self, sessions_dir: Path) -> None:
        self._sessions_dir = sessions_dir
        self._sessions_dir.mkdir(parents=True, exist_ok=True)
        self._lock = threading.Lock()

    def append(self, record: PatchRecord) -> None:
        path = self._path_for(record.session_id)
        line = record.model_dump_json() + "\n"
        with self._lock, path.open("a", encoding="utf-8", newline="\n") as handle:
            handle.write(line)
            handle.flush()

    def list_by_session(self, session_id: UUID) -> list[PatchRecord]:
        path = self._path_for(session_id)
        if not path.exists():
            return []

        records: list[PatchRecord] = []
        with self._lock, path.open("r", encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, start=1):
                stripped = line.strip()
                if not stripped:
                    continue
                try:
                    records.append(PatchRecord.model_validate_json(stripped))
                except ValueError as exc:
                    raise ValueError(
                        f"Invalid patch record at {path}:{line_number}"
                    ) from exc
        return records

    def replace_session(self, session_id: UUID, records: list[PatchRecord]) -> None:
        if any(record.session_id != session_id for record in records):
            raise ValueError("all records must belong to the target session")

        path = self._path_for(session_id)
        temporary = path.with_suffix(".jsonl.tmp")
        payload = "".join(record.model_dump_json() + "\n" for record in records)
        with self._lock:
            temporary.write_text(payload, encoding="utf-8", newline="\n")
            temporary.replace(path)

    def clear_session(self, session_id: UUID) -> None:
        path = self._path_for(session_id)
        with self._lock:
            path.unlink(missing_ok=True)

    def export_session(self, session_id: UUID, destination: Path) -> Path:
        records = self.list_by_session(session_id)
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text(
            json.dumps(
                [record.model_dump(mode="json") for record in records],
                ensure_ascii=False,
                indent=2,
                default=str,
            )
            + "\n",
            encoding="utf-8",
        )
        return destination

    def _path_for(self, session_id: UUID) -> Path:
        return self._sessions_dir / f"{session_id}.jsonl"
