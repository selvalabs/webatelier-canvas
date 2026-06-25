from __future__ import annotations

from pathlib import Path

import pytest
from pydantic import ValidationError

from webdesign_ai_editor.domain.models import InsertElementNode

STATIC_DIR = (
    Path(__file__).resolve().parents[1]
    / "src"
    / "webdesign_ai_editor"
    / "static"
)


def read_js_hub_source() -> str:
    files = sorted(STATIC_DIR.glob("editor-extension-js-hub-*.js"))
    assert len(files) >= 4
    return "\n".join(path.read_text(encoding="utf-8") for path in files)


def test_js_hub_ships_reviewed_tools_without_dynamic_code_execution() -> None:
    source = read_js_hub_source()
    lowered = source.casefold()

    assert "eval(" not in source
    assert "new Function" not in source
    assert "onclick=" not in lowered
    assert "<script" not in lowered


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
