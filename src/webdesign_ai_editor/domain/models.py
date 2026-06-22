from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

ALLOWED_STYLE_PROPERTIES = frozenset(
    {
        "alignItems",
        "alignSelf",
        "backgroundColor",
        "borderColor",
        "borderRadius",
        "borderStyle",
        "borderWidth",
        "bottom",
        "boxShadow",
        "color",
        "display",
        "flexDirection",
        "flexGrow",
        "flexShrink",
        "flexWrap",
        "fontFamily",
        "fontSize",
        "fontStyle",
        "fontWeight",
        "gap",
        "height",
        "justifyContent",
        "left",
        "letterSpacing",
        "lineHeight",
        "margin",
        "marginBottom",
        "marginLeft",
        "marginRight",
        "marginTop",
        "maxHeight",
        "maxWidth",
        "minHeight",
        "minWidth",
        "objectFit",
        "opacity",
        "overflow",
        "padding",
        "paddingBottom",
        "paddingLeft",
        "paddingRight",
        "paddingTop",
        "position",
        "right",
        "textAlign",
        "textDecoration",
        "textTransform",
        "top",
        "transform",
        "transformOrigin",
        "whiteSpace",
        "width",
        "zIndex",
    }
)

ALLOWED_ATTRIBUTES = frozenset(
    {
        "alt",
        "aria-label",
        "href",
        "placeholder",
        "src",
        "title",
    }
)

FORBIDDEN_VALUE_FRAGMENTS = (
    "@import",
    "behavior:",
    "data:text/html",
    "expression(",
    "javascript:",
    "vbscript:",
    "url(",
    "<script",
    "</",
)


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Rect(StrictModel):
    x: float
    y: float
    width: float = Field(ge=0)
    height: float = Field(ge=0)
    top: float
    right: float
    bottom: float
    left: float


class ElementContext(StrictModel):
    selector: str = Field(min_length=1, max_length=2048)
    tag_name: str = Field(min_length=1, max_length=64)
    text: str = Field(default="", max_length=5000)
    attributes: dict[str, str] = Field(default_factory=dict)
    styles: dict[str, str] = Field(default_factory=dict)
    rect: Rect
    ancestors: list[str] = Field(default_factory=list, max_length=12)

    @field_validator("attributes")
    @classmethod
    def limit_attributes(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 40:
            raise ValueError("too many attributes")
        return {str(key)[:128]: str(item)[:1000] for key, item in value.items()}

    @field_validator("styles")
    @classmethod
    def limit_styles(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > 80:
            raise ValueError("too many styles")
        return {str(key)[:128]: str(item)[:1000] for key, item in value.items()}


class SetStyleAction(StrictModel):
    type: Literal["set_style"]
    property: str = Field(min_length=1, max_length=100)
    value: str = Field(max_length=500)

    @field_validator("property")
    @classmethod
    def validate_property(cls, value: str) -> str:
        if value not in ALLOWED_STYLE_PROPERTIES:
            raise ValueError(f"style property is not allowed: {value}")
        return value

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: str) -> str:
        lowered = value.casefold()
        if any(fragment in lowered for fragment in FORBIDDEN_VALUE_FRAGMENTS):
            raise ValueError("style value contains a forbidden fragment")
        if "<" in value or ">" in value:
            raise ValueError("markup is not allowed in style values")
        return value


class SetTextAction(StrictModel):
    type: Literal["set_text"]
    value: str = Field(max_length=5000)


class SetAttributeAction(StrictModel):
    type: Literal["set_attribute"]
    name: str = Field(min_length=1, max_length=128)
    value: str = Field(max_length=5000)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        lowered = value.casefold()
        if lowered.startswith("on") or lowered not in ALLOWED_ATTRIBUTES:
            raise ValueError(f"attribute is not allowed: {value}")
        return lowered

    @field_validator("value")
    @classmethod
    def validate_attribute_value(cls, value: str) -> str:
        lowered = value.strip().casefold()
        if lowered.startswith(("javascript:", "vbscript:", "data:text/html")):
            raise ValueError("unsafe attribute value")
        if "<script" in lowered or "</" in lowered:
            raise ValueError("markup is not allowed in attribute values")
        return value


EditorAction = Annotated[
    SetStyleAction | SetTextAction | SetAttributeAction,
    Field(discriminator="type"),
]


class EditPlan(StrictModel):
    summary: str = Field(min_length=1, max_length=500)
    actions: list[EditorAction] = Field(min_length=1, max_length=20)
    warnings: list[str] = Field(default_factory=list, max_length=10)


class AIEditRequest(StrictModel):
    prompt: str = Field(min_length=1, max_length=4000)
    context: ElementContext


PatchSource = Literal["manual", "ai", "undo", "redo", "system"]
PatchAction = Literal["set_style", "set_text", "set_attribute"]


class PatchEvent(StrictModel):
    selector: str = Field(min_length=1, max_length=2048)
    source: PatchSource
    action: PatchAction
    property: str | None = Field(default=None, max_length=128)
    before: str | None = Field(default=None, max_length=10000)
    after: str | None = Field(default=None, max_length=10000)

    @model_validator(mode="after")
    def validate_property_shape(self) -> PatchEvent:
        if self.action == "set_style":
            if self.property not in ALLOWED_STYLE_PROPERTIES:
                raise ValueError("set_style patch requires an allowed property")
        elif self.action == "set_attribute":
            if self.property not in ALLOWED_ATTRIBUTES:
                raise ValueError("set_attribute patch requires an allowed attribute")
        elif self.property is not None:
            raise ValueError("set_text patch cannot include property")
        return self


class BridgePatchMessage(StrictModel):
    type: Literal["patch"]
    patch: PatchEvent


class PatchRecord(StrictModel):
    id: UUID = Field(default_factory=uuid4)
    session_id: UUID
    url: str = Field(min_length=1, max_length=4096)
    selector: str = Field(min_length=1, max_length=2048)
    source: PatchSource
    action: PatchAction
    property: str | None = None
    before: str | None = None
    after: str | None = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    @classmethod
    def from_event(cls, *, session_id: UUID, url: str, event: PatchEvent) -> PatchRecord:
        return cls(
            session_id=session_id,
            url=url,
            selector=event.selector,
            source=event.source,
            action=event.action,
            property=event.property,
            before=event.before,
            after=event.after,
        )
