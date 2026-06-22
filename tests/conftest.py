from __future__ import annotations

from webdesign_ai_editor.domain.models import ElementContext, Rect


def make_element_context() -> ElementContext:
    return ElementContext(
        selector="#hero-title",
        tag_name="h1",
        text="Título",
        attributes={"id": "hero-title"},
        styles={"fontSize": "40px", "color": "rgb(15, 23, 42)"},
        rect=Rect(
            x=10,
            y=20,
            width=400,
            height=60,
            top=20,
            right=410,
            bottom=80,
            left=10,
        ),
        ancestors=["section.hero", "main"],
    )
