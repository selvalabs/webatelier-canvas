from __future__ import annotations

import re
from pathlib import Path

import pytest
from pydantic import ValidationError

from webdesign_ai_editor.domain.models import InsertElementNode


STATIC_DIR = Path(__file__).resolve().parents[1] / "src" / "webdesign_ai_editor" / "static"


def test_js_hub_ships_reviewed_tools_without_dynamic_code_execution() -> None:
    files = sorted(STATIC_DIR.glob("editor-extension-js-hub-*.js"))
    assert len(files) >= 4

    source = "\n".join(path.read_text(encoding="utf-8") for path in files)
    assert not re.search(r"\beval\s*\(", source)
    assert not re.search(r"new\s+Function\b", source)
    assert "onclick=" not in source.casefold()
    assert "<script" not in source.casefold()


@pytest.mark.parametrize(
    "tool_id",
    ["accordion", "tabs", "modal", "mobile-menu", "reveal"],
)
def test_registry_contains_initial_tool_set(tool_id: str) -> None:
    registry = (STATIC_DIR / "editor-extension-js-hub-registry.js").read_text(
        encoding="utf-8"
    )
    assert f'id: "{tool_id}"' in registry


def test_tool_nodes_use_allowlisted_attributes() -> None:
    node = InsertElementNode(
        tag="button",
        text="Alternar",
        attributes={"class": "wda-tool-accordion-trigger", "type": "button"},
        styles={"padding": "12px", "fontWeight": "700"},
    )
    assert node.attributes["class"] == "wda-tool-accordion-trigger"

    with pytest.raises(ValidationError, match="insert attribute is not allowed"):
        InsertElementNode(tag="button", attributes={"onmouseover": "run()"})
