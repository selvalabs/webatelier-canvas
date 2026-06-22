from __future__ import annotations

from uuid import uuid4

import pytest
from pydantic import ValidationError

from tests.conftest import make_element_context
from webdesign_ai_editor.domain.models import (
    AIEditRequest,
    EditPlan,
    PatchEvent,
    PatchRecord,
)


def test_valid_edit_plan_accepts_allowlisted_actions() -> None:
    plan = EditPlan.model_validate(
        {
            "summary": "Ajusta o título",
            "actions": [
                {"type": "set_style", "property": "fontSize", "value": "48px"},
                {"type": "set_text", "value": "Novo título"},
            ],
            "warnings": [],
        }
    )

    assert len(plan.actions) == 2


@pytest.mark.parametrize(
    ("action", "message"),
    [
        (
            {"type": "set_style", "property": "backgroundImage", "value": "none"},
            "style property is not allowed",
        ),
        (
            {"type": "set_style", "property": "color", "value": "url(https://x)"},
            "forbidden fragment",
        ),
        (
            {"type": "set_attribute", "name": "onclick", "value": "alert(1)"},
            "attribute is not allowed",
        ),
        (
            {"type": "set_attribute", "name": "href", "value": "javascript:alert(1)"},
            "unsafe attribute value",
        ),
    ],
)
def test_edit_plan_rejects_unsafe_actions(action: dict[str, str], message: str) -> None:
    with pytest.raises(ValidationError, match=message):
        EditPlan.model_validate(
            {"summary": "Inválido", "actions": [action], "warnings": []}
        )


def test_patch_event_requires_property_shape() -> None:
    with pytest.raises(ValidationError, match="set_text patch cannot include property"):
        PatchEvent(
            selector="#hero-title",
            source="manual",
            action="set_text",
            property="textContent",
            before="A",
            after="B",
        )


def test_patch_record_is_created_from_event() -> None:
    session_id = uuid4()
    event = PatchEvent(
        selector="#hero-title",
        source="manual",
        action="set_style",
        property="fontSize",
        before=None,
        after="48px",
    )

    record = PatchRecord.from_event(
        session_id=session_id,
        url="http://127.0.0.1:3000",
        event=event,
    )

    assert record.session_id == session_id
    assert record.after == "48px"


def test_ai_request_limits_prompt_and_context() -> None:
    request = AIEditRequest(prompt="Aumente o título", context=make_element_context())
    assert request.context.selector == "#hero-title"
