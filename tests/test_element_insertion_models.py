from __future__ import annotations

import json

import pytest
from pydantic import ValidationError

from webdesign_ai_editor.domain.models import EditPlan, InsertElementNode, PatchEvent


def test_edit_plan_accepts_structured_insertion() -> None:
    plan = EditPlan.model_validate(
        {
            "summary": "Adiciona um card",
            "actions": [
                {
                    "type": "insert_element",
                    "position": "inside_end",
                    "element": {
                        "tag": "article",
                        "styles": {"padding": "24px", "borderRadius": "16px"},
                        "children": [
                            {"tag": "h3", "text": "Título"},
                            {"tag": "p", "text": "Descrição"},
                        ],
                    },
                }
            ],
            "warnings": [],
        }
    )

    action = plan.actions[0]
    assert action.type == "insert_element"
    assert action.element.tag == "article"
    assert len(action.element.children) == 2


def test_insert_node_rejects_scripts_and_handlers() -> None:
    with pytest.raises(ValidationError, match="insert tag is not allowed"):
        InsertElementNode(tag="script", text="alert(1)")

    with pytest.raises(ValidationError, match="insert attribute is not allowed"):
        InsertElementNode(tag="button", attributes={"onclick": "alert(1)"})


def test_insert_node_rejects_unsafe_style() -> None:
    with pytest.raises(ValidationError, match="forbidden fragment"):
        InsertElementNode(tag="div", styles={"color": "url(https://example.test/x)"})


def test_insert_patch_validates_serialized_node() -> None:
    node = InsertElementNode(tag="button", text="Comprar", attributes={"type": "button"})
    patch = PatchEvent(
        selector="#hero",
        source="manual",
        action="insert_element",
        property="inside_end",
        before=None,
        after=json.dumps(node.model_dump(mode="json")),
    )

    assert patch.action == "insert_element"

    with pytest.raises(ValidationError, match="invalid element state"):
        PatchEvent(
            selector="#hero",
            source="manual",
            action="insert_element",
            property="inside_end",
            after='{"tag":"script"}',
        )
