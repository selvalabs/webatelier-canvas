import Moveable from "moveable";
import panelStyles from "./styles.css?inline";

type EditableElement = HTMLElement | SVGElement;
type PatchSource = "manual" | "ai" | "undo" | "redo" | "system";
type PatchAction = "set_style" | "set_text" | "set_attribute";

interface PatchEvent {
  selector: string;
  source: PatchSource;
  action: PatchAction;
  property?: string | null;
  before?: string | null;
  after?: string | null;
}

interface BridgePatchMessage {
  type: "patch";
  patch: PatchEvent;
}

interface RectContext {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

interface ElementContext {
  selector: string;
  tag_name: string;
  text: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  rect: RectContext;
  ancestors: string[];
}

interface AIEditRequest {
  prompt: string;
  context: ElementContext;
}

interface SetStyleAction {
  type: "set_style";
  property: string;
  value: string;
}

interface SetTextAction {
  type: "set_text";
  value: string;
}

interface SetAttributeAction {
  type: "set_attribute";
  name: string;
  value: string;
}

type EditorAction = SetStyleAction | SetTextAction | SetAttributeAction;

interface EditPlan {
  summary: string;
  actions: EditorAction[];
  warnings: string[];
}

interface EmitResult {
  ok: boolean;
  record_id?: string;
  error?: string;
}

declare global {
  interface Window {
    __WDA_EDITOR_ACTIVE__?: boolean;
    __wda_emit?: (message: BridgePatchMessage) => Promise<EmitResult>;
    __wda_ai_edit?: (request: AIEditRequest) => Promise<EditPlan>;
  }
}

const HOST_ID = "__wda_editor_host__";
const GLOBAL_STYLE_ID = "__wda_editor_global_style__";
const MAX_GUIDELINES = 300;
const STYLE_CONTEXT_PROPERTIES = [
  "display",
  "position",
  "width",
  "height",
  "minWidth",
  "maxWidth",
  "minHeight",
  "maxHeight",
  "fontFamily",
  "fontSize",
  "fontWeight",
  "fontStyle",
  "lineHeight",
  "letterSpacing",
  "color",
  "backgroundColor",
  "textAlign",
  "padding",
  "margin",
  "borderRadius",
  "borderWidth",
  "borderStyle",
  "borderColor",
  "boxShadow",
  "opacity",
  "transform",
  "alignItems",
  "justifyContent",
  "gap",
  "overflow",
  "objectFit"
] as const;

const ALLOWED_AI_STYLE_PROPERTIES = new Set([
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
  "zIndex"
]);

const ALLOWED_AI_ATTRIBUTES = new Set([
  "alt",
  "aria-label",
  "href",
  "placeholder",
  "src",
  "title"
]);

const FORBIDDEN_VALUE_FRAGMENTS = [
  "@import",
  "behavior:",
  "data:text/html",
  "expression(",
  "javascript:",
  "vbscript:",
  "url(",
  "<script",
  "</"
];

class VisualEditor {
  private readonly host: HTMLDivElement;
  private readonly shadow: ShadowRoot;
  private readonly moveable: Moveable;
  private selected: EditableElement | null = null;
  private selector = "";
  private mode: "edit" | "interact" = "edit";
  private history: PatchEvent[] = [];
  private historyCursor = 0;
  private gestureBefore = new Map<string, string | null>();
  private scheduledPanelUpdate = 0;
  private textEditCleanup: (() => void) | null = null;

  private readonly modeButton: HTMLButtonElement;
  private readonly emptyState: HTMLParagraphElement;
  private readonly selectedState: HTMLDivElement;
  private readonly elementLabel: HTMLDivElement;
  private readonly selectorLabel: HTMLElement;
  private readonly status: HTMLDivElement;
  private readonly undoButton: HTMLButtonElement;
  private readonly redoButton: HTMLButtonElement;
  private readonly promptButton: HTMLButtonElement;

  private readonly fields: {
    text: HTMLTextAreaElement;
    width: HTMLInputElement;
    height: HTMLInputElement;
    rotation: HTMLInputElement;
    fontFamily: HTMLInputElement;
    fontSize: HTMLInputElement;
    fontWeight: HTMLSelectElement;
    color: HTMLInputElement;
    backgroundColor: HTMLInputElement;
    opacity: HTMLInputElement;
    textAlign: HTMLSelectElement;
    borderRadius: HTMLInputElement;
    prompt: HTMLTextAreaElement;
  };

  constructor() {
    this.host = document.createElement("div");
    this.host.id = HOST_ID;
    this.host.dataset.wdaEditorUi = "true";
    this.host.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:2147483647;";
    document.documentElement.appendChild(this.host);
    this.shadow = this.host.attachShadow({ mode: "open" });
    this.shadow.innerHTML = this.renderPanel();
    this.installGlobalStyles();

    this.modeButton = this.requireElement<HTMLButtonElement>("#wda-mode");
    this.emptyState = this.requireElement<HTMLParagraphElement>("#wda-empty");
    this.selectedState = this.requireElement<HTMLDivElement>("#wda-selected");
    this.elementLabel = this.requireElement<HTMLDivElement>("#wda-element-label");
    this.selectorLabel = this.requireElement<HTMLElement>("#wda-selector");
    this.status = this.requireElement<HTMLDivElement>("#wda-status");
    this.undoButton = this.requireElement<HTMLButtonElement>("#wda-undo");
    this.redoButton = this.requireElement<HTMLButtonElement>("#wda-redo");
    this.promptButton = this.requireElement<HTMLButtonElement>("#wda-apply-prompt");

    this.fields = {
      text: this.requireElement<HTMLTextAreaElement>("#wda-text"),
      width: this.requireElement<HTMLInputElement>("#wda-width"),
      height: this.requireElement<HTMLInputElement>("#wda-height"),
      rotation: this.requireElement<HTMLInputElement>("#wda-rotation"),
      fontFamily: this.requireElement<HTMLInputElement>("#wda-font-family"),
      fontSize: this.requireElement<HTMLInputElement>("#wda-font-size"),
      fontWeight: this.requireElement<HTMLSelectElement>("#wda-font-weight"),
      color: this.requireElement<HTMLInputElement>("#wda-color"),
      backgroundColor: this.requireElement<HTMLInputElement>("#wda-background-color"),
      opacity: this.requireElement<HTMLInputElement>("#wda-opacity"),
      textAlign: this.requireElement<HTMLSelectElement>("#wda-text-align"),
      borderRadius: this.requireElement<HTMLInputElement>("#wda-border-radius"),
      prompt: this.requireElement<HTMLTextAreaElement>("#wda-prompt")
    };

    this.moveable = new Moveable(document.body, {
      target: null,
      container: document.body,
      className: "wda-moveable",
      draggable: true,
      resizable: true,
      rotatable: true,
      snappable: true,
      snapThreshold: 6,
      snapGap: true,
      isDisplaySnapDigit: true,
      snapDirections: {
        left: true,
        top: true,
        right: true,
        bottom: true,
        center: true,
        middle: true
      },
      elementSnapDirections: {
        left: true,
        top: true,
        right: true,
        bottom: true,
        center: true,
        middle: true
      },
      verticalGuidelines: this.viewportVerticalGuidelines(),
      horizontalGuidelines: this.viewportHorizontalGuidelines(),
      elementGuidelines: [],
      renderDirections: ["nw", "n", "ne", "w", "e", "sw", "s", "se"],
      origin: false,
      edge: false,
      keepRatio: false,
      throttleDrag: 0,
      throttleResize: 0,
      throttleRotate: 0
    });

    this.bindMoveable();
    this.bindUi();
    this.bindPageEvents();
    this.updateHistoryButtons();
    this.updateModeButton();
  }

  private renderPanel(): string {
    return `
      <style>${panelStyles}</style>
      <aside class="wda-panel" data-wda-editor-ui="true" aria-label="WebDesign AI Editor">
        <header class="wda-header">
          <div class="wda-brand">WebDesign AI Editor</div>
          <button id="wda-mode" class="wda-mode" type="button" title="Alt+E"></button>
        </header>
        <div class="wda-content">
          <p id="wda-empty" class="wda-empty">Clique em um elemento da página para editar.</p>
          <div id="wda-selected" class="wda-selected" data-active="false">
            <div id="wda-element-label" class="wda-element-label"></div>
            <code id="wda-selector" class="wda-selector"></code>

            <fieldset class="wda-section">
              <legend class="wda-section-title">Conteúdo</legend>
              <label class="wda-field">
                <span>Texto</span>
                <textarea id="wda-text" class="wda-textarea"></textarea>
              </label>
            </fieldset>

            <fieldset class="wda-section">
              <legend class="wda-section-title">Geometria</legend>
              <div class="wda-grid wda-grid-3">
                <label class="wda-field"><span>Largura px</span><input id="wda-width" class="wda-input" type="number" min="1" step="1"></label>
                <label class="wda-field"><span>Altura px</span><input id="wda-height" class="wda-input" type="number" min="1" step="1"></label>
                <label class="wda-field"><span>Rotação °</span><input id="wda-rotation" class="wda-input" type="number" step="1"></label>
              </div>
            </fieldset>

            <fieldset class="wda-section">
              <legend class="wda-section-title">Tipografia</legend>
              <div class="wda-grid">
                <label class="wda-field wda-field-full"><span>Fonte</span><input id="wda-font-family" class="wda-input" type="text"></label>
                <label class="wda-field"><span>Tamanho px</span><input id="wda-font-size" class="wda-input" type="number" min="1" step="1"></label>
                <label class="wda-field"><span>Peso</span>
                  <select id="wda-font-weight" class="wda-select">
                    <option value="100">100</option><option value="200">200</option><option value="300">300</option>
                    <option value="400">400</option><option value="500">500</option><option value="600">600</option>
                    <option value="700">700</option><option value="800">800</option><option value="900">900</option>
                    <option value="normal">normal</option><option value="bold">bold</option>
                  </select>
                </label>
                <label class="wda-field"><span>Cor</span><input id="wda-color" class="wda-input" type="color"></label>
                <label class="wda-field"><span>Alinhamento</span>
                  <select id="wda-text-align" class="wda-select">
                    <option value="start">start</option><option value="left">left</option><option value="center">center</option>
                    <option value="right">right</option><option value="justify">justify</option><option value="end">end</option>
                  </select>
                </label>
              </div>
            </fieldset>

            <fieldset class="wda-section">
              <legend class="wda-section-title">Aparência</legend>
              <div class="wda-grid">
                <label class="wda-field"><span>Fundo</span><input id="wda-background-color" class="wda-input" type="color"></label>
                <label class="wda-field"><span>Opacidade</span><input id="wda-opacity" class="wda-input" type="number" min="0" max="1" step="0.05"></label>
                <label class="wda-field"><span>Raio px</span><input id="wda-border-radius" class="wda-input" type="number" min="0" step="1"></label>
              </div>
            </fieldset>

            <fieldset class="wda-section">
              <legend class="wda-section-title">Prompt local</legend>
              <label class="wda-field">
                <span>Alteração desejada para o elemento selecionado</span>
                <textarea id="wda-prompt" class="wda-textarea" placeholder="Ex.: deixe este título mais elegante e com maior contraste"></textarea>
              </label>
              <button id="wda-apply-prompt" class="wda-button wda-button-primary" type="button">Aplicar com Gemma</button>
              <p class="wda-hint">Ollama é chamado pelo processo Python local. O plano passa por validação antes de ser aplicado.</p>
            </fieldset>

            <div class="wda-actions">
              <button id="wda-undo" class="wda-button" type="button">Desfazer</button>
              <button id="wda-redo" class="wda-button" type="button">Refazer</button>
            </div>
            <div id="wda-status" class="wda-status" role="status" aria-live="polite"></div>
          </div>
        </div>
      </aside>
    `;
  }

  private installGlobalStyles(): void {
    if (document.getElementById(GLOBAL_STYLE_ID)) {
      return;
    }
    const style = document.createElement("style");
    style.id = GLOBAL_STYLE_ID;
    style.dataset.wdaEditorUi = "true";
    style.textContent = `
      .wda-moveable.moveable-control-box { z-index: 2147483646 !important; }
      .wda-moveable .moveable-line { background: #2563eb !important; }
      .wda-moveable .moveable-guideline { background: #ec4899 !important; }
      .wda-moveable .moveable-control {
        width: 10px !important;
        height: 10px !important;
        margin-top: -5px !important;
        margin-left: -5px !important;
        border: 2px solid #2563eb !important;
        background: #ffffff !important;
        box-sizing: border-box !important;
      }
      .wda-moveable .moveable-rotation-control {
        border-color: #7c3aed !important;
      }
      .wda-moveable .moveable-rotation-line {
        background: #7c3aed !important;
      }
      .wda-moveable .moveable-snap-digit {
        padding: 2px 4px !important;
        border-radius: 4px !important;
        background: #0f172a !important;
        color: #ffffff !important;
        font: 10px/1.2 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
      }
    `;
    document.head.appendChild(style);
  }

  private requireElement<T extends Element>(selector: string): T {
    const element = this.shadow.querySelector<T>(selector);
    if (!element) {
      throw new Error(`Editor UI element not found: ${selector}`);
    }
    return element;
  }

  private bindUi(): void {
    this.modeButton.addEventListener("click", () => this.toggleMode());
    this.undoButton.addEventListener("click", () => this.undo());
    this.redoButton.addEventListener("click", () => this.redo());
    this.promptButton.addEventListener("click", () => void this.applyPrompt());

    this.fields.text.addEventListener("change", () => {
      if (this.selected) {
        this.applyText(this.selected, this.fields.text.value, "manual");
      }
    });
    this.fields.width.addEventListener("change", () => this.applyNumericStyle("width", this.fields.width, "px"));
    this.fields.height.addEventListener("change", () => this.applyNumericStyle("height", this.fields.height, "px"));
    this.fields.fontSize.addEventListener("change", () => this.applyNumericStyle("fontSize", this.fields.fontSize, "px"));
    this.fields.borderRadius.addEventListener("change", () => this.applyNumericStyle("borderRadius", this.fields.borderRadius, "px"));
    this.fields.opacity.addEventListener("change", () => this.applyNumericStyle("opacity", this.fields.opacity, ""));
    this.fields.fontFamily.addEventListener("change", () => this.applyFieldStyle("fontFamily", this.fields.fontFamily.value));
    this.fields.fontWeight.addEventListener("change", () => this.applyFieldStyle("fontWeight", this.fields.fontWeight.value));
    this.fields.color.addEventListener("change", () => this.applyFieldStyle("color", this.fields.color.value));
    this.fields.backgroundColor.addEventListener("change", () => this.applyFieldStyle("backgroundColor", this.fields.backgroundColor.value));
    this.fields.textAlign.addEventListener("change", () => this.applyFieldStyle("textAlign", this.fields.textAlign.value));
    this.fields.rotation.addEventListener("change", () => this.applyRotationFromField());
  }

  private bindPageEvents(): void {
    document.addEventListener("pointerdown", (event) => this.onPointerDown(event), true);
    document.addEventListener("click", (event) => this.onClickCapture(event), true);
    document.addEventListener("dblclick", (event) => this.onDoubleClick(event), true);
    document.addEventListener("keydown", (event) => this.onKeyDown(event), true);
    window.addEventListener("resize", () => this.refreshGeometry(), { passive: true });
    window.addEventListener("scroll", () => this.refreshGeometry(), { passive: true, capture: true });
  }

  private bindMoveable(): void {
    this.moveable
      .on("dragStart", ({ target }) => {
        this.captureGesture(target as EditableElement, ["transform"]);
      })
      .on("drag", ({ target, transform }) => {
        (target as EditableElement).style.transform = transform;
        this.schedulePanelUpdate();
      })
      .on("dragEnd", ({ target }) => {
        this.commitGesture(target as EditableElement, ["transform"]);
      })
      .on("resizeStart", ({ target }) => {
        this.captureGesture(target as EditableElement, ["width", "height", "transform"]);
      })
      .on("resize", ({ target, width, height, drag }) => {
        const element = target as EditableElement;
        element.style.width = `${Math.max(1, width)}px`;
        element.style.height = `${Math.max(1, height)}px`;
        if (drag?.transform) {
          element.style.transform = drag.transform;
        }
        this.schedulePanelUpdate();
      })
      .on("resizeEnd", ({ target }) => {
        this.commitGesture(target as EditableElement, ["width", "height", "transform"]);
      })
      .on("rotateStart", ({ target }) => {
        this.captureGesture(target as EditableElement, ["transform"]);
      })
      .on("rotate", ({ target, transform }) => {
        (target as EditableElement).style.transform = transform;
        this.schedulePanelUpdate();
      })
      .on("rotateEnd", ({ target }) => {
        this.commitGesture(target as EditableElement, ["transform"]);
      });
  }

  private onPointerDown(event: PointerEvent): void {
    if (this.mode !== "edit" || this.isEditorUiEvent(event)) {
      return;
    }
    const candidate = this.findEditableCandidate(event);
    if (!candidate) {
      return;
    }

    if (this.selected && (candidate === this.selected || this.selected.contains(candidate))) {
      event.preventDefault();
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    this.select(candidate);
  }

  private onClickCapture(event: MouseEvent): void {
    if (this.mode !== "edit" || this.isEditorUiEvent(event)) {
      return;
    }
    if (this.findEditableCandidate(event)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }

  private onDoubleClick(event: MouseEvent): void {
    if (this.mode !== "edit" || this.isEditorUiEvent(event)) {
      return;
    }
    const candidate = this.findEditableCandidate(event);
    if (!candidate || candidate !== this.selected || !this.canEditText(candidate)) {
      return;
    }
    event.preventDefault();
    event.stopImmediatePropagation();
    this.beginDirectTextEdit(candidate);
  }

  private onKeyDown(event: KeyboardEvent): void {
    if (this.isEditorUiEvent(event) && event.key !== "Escape") {
      return;
    }
    const modifier = event.ctrlKey || event.metaKey;
    if (event.altKey && event.key.toLowerCase() === "e") {
      event.preventDefault();
      this.toggleMode();
      return;
    }
    if (event.key === "Escape") {
      this.textEditCleanup?.();
      this.clearSelection();
      return;
    }
    if (modifier && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }
    if (modifier && event.key.toLowerCase() === "y") {
      event.preventDefault();
      this.redo();
    }
  }

  private isEditorUiEvent(event: Event): boolean {
    return event.composedPath().some((node) => {
      if (!(node instanceof Element)) {
        return false;
      }
      return Boolean(
        node.closest?.(`#${HOST_ID}, [data-wda-editor-ui="true"], .moveable-control-box, .wda-moveable`)
      );
    });
  }

  private findEditableCandidate(event: Event): EditableElement | null {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement || node instanceof SVGElement)) {
        continue;
      }
      if (this.isForbiddenElement(node) || !this.isVisible(node)) {
        continue;
      }
      return node;
    }
    return null;
  }

  private isForbiddenElement(element: Element): boolean {
    const tag = element.tagName.toLowerCase();
    return ["html", "head", "script", "style", "meta", "link", "noscript"].includes(tag)
      || element.id === HOST_ID
      || element.hasAttribute("data-wda-editor-ui")
      || Boolean(element.closest(`#${HOST_ID}, .moveable-control-box, .wda-moveable`));
  }

  private isVisible(element: Element): boolean {
    const rect = element.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      return false;
    }
    const style = getComputedStyle(element);
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0";
  }

  private select(element: EditableElement): void {
    this.textEditCleanup?.();
    this.selected = element;
    this.selector = createStableSelector(element);
    this.moveable.target = element;
    this.refreshGuidelines();
    this.moveable.updateRect();
    this.emptyState.style.display = "none";
    this.selectedState.dataset.active = "true";
    this.updatePanel();
    this.setStatus("Elemento selecionado.", "success");
  }

  private clearSelection(): void {
    this.selected = null;
    this.selector = "";
    this.moveable.target = null;
    this.emptyState.style.display = "block";
    this.selectedState.dataset.active = "false";
    this.setStatus("");
  }

  private toggleMode(): void {
    this.mode = this.mode === "edit" ? "interact" : "edit";
    this.updateModeButton();
    this.moveable.draggable = this.mode === "edit";
    this.moveable.resizable = this.mode === "edit";
    this.moveable.rotatable = this.mode === "edit";
    this.setStatus(
      this.mode === "edit"
        ? "Modo editar ativo."
        : "Modo interagir ativo: a página recebe cliques normalmente.",
      "success"
    );
  }

  private updateModeButton(): void {
    this.modeButton.dataset.mode = this.mode;
    this.modeButton.textContent = this.mode === "edit" ? "EDITAR" : "INTERAGIR";
    this.modeButton.setAttribute("aria-pressed", String(this.mode === "edit"));
  }

  private updatePanel(): void {
    if (!this.selected) {
      return;
    }
    const element = this.selected;
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    this.elementLabel.textContent = `<${element.tagName.toLowerCase()}>`;
    this.selectorLabel.textContent = this.selector;
    this.selectorLabel.title = this.selector;
    this.fields.text.value = (element.textContent ?? "").trim().slice(0, 5000);
    this.fields.width.value = String(Math.round(rect.width));
    this.fields.height.value = String(Math.round(rect.height));
    this.fields.rotation.value = String(Math.round(extractRotationDegrees(style.transform)));
    this.fields.fontFamily.value = style.fontFamily;
    this.fields.fontSize.value = numericCssValue(style.fontSize);
    this.ensureSelectValue(this.fields.fontWeight, style.fontWeight);
    this.fields.color.value = cssColorToHex(style.color, "#000000");
    this.fields.backgroundColor.value = cssColorToHex(style.backgroundColor, "#ffffff");
    this.fields.opacity.value = style.opacity || "1";
    this.ensureSelectValue(this.fields.textAlign, style.textAlign || "start");
    this.fields.borderRadius.value = numericCssValue(style.borderRadius);
  }

  private schedulePanelUpdate(): void {
    if (this.scheduledPanelUpdate) {
      cancelAnimationFrame(this.scheduledPanelUpdate);
    }
    this.scheduledPanelUpdate = requestAnimationFrame(() => {
      this.scheduledPanelUpdate = 0;
      this.updatePanel();
      this.moveable.updateRect();
    });
  }

  private ensureSelectValue(select: HTMLSelectElement, value: string): void {
    const options = Array.from(select.options);
    const found = options.some((option) => option.value === value);
    if (!found) {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    }
    select.value = value;
  }

  private applyNumericStyle(property: string, field: HTMLInputElement, suffix: string): void {
    const raw = field.value.trim();
    if (!raw || !this.selected) {
      return;
    }
    const numeric = Number(raw);
    if (!Number.isFinite(numeric)) {
      this.setStatus(`Valor inválido para ${property}.`, "error");
      return;
    }
    this.applyStyle(this.selected, property, `${numeric}${suffix}`, "manual");
  }

  private applyFieldStyle(property: string, value: string): void {
    if (this.selected) {
      this.applyStyle(this.selected, property, value, "manual");
    }
  }

  private applyRotationFromField(): void {
    if (!this.selected) {
      return;
    }
    const degrees = Number(this.fields.rotation.value);
    if (!Number.isFinite(degrees)) {
      this.setStatus("Rotação inválida.", "error");
      return;
    }
    const current = this.selected.style.transform || "";
    const next = replaceRotation(current, degrees);
    this.applyStyle(this.selected, "transform", next, "manual");
  }

  private applyStyle(
    target: EditableElement,
    property: string,
    value: string,
    source: PatchSource
  ): void {
    const cssProperty = camelToKebab(property);
    const before = inlineStyleValue(target, property);
    target.style.setProperty(cssProperty, value);
    const after = inlineStyleValue(target, property);
    this.commitPatch({
      selector: createStableSelector(target),
      source,
      action: "set_style",
      property,
      before,
      after
    });
    this.refreshAfterChange(target);
  }

  private applyText(target: EditableElement, value: string, source: PatchSource): void {
    const before = target.textContent;
    target.textContent = value;
    const after = target.textContent;
    this.commitPatch({
      selector: createStableSelector(target),
      source,
      action: "set_text",
      property: null,
      before,
      after
    });
    this.refreshAfterChange(target);
  }

  private applyAttribute(
    target: EditableElement,
    name: string,
    value: string,
    source: PatchSource
  ): void {
    const before = target.getAttribute(name);
    target.setAttribute(name, value);
    const after = target.getAttribute(name);
    this.commitPatch({
      selector: createStableSelector(target),
      source,
      action: "set_attribute",
      property: name,
      before,
      after
    });
    this.refreshAfterChange(target);
  }

  private refreshAfterChange(target: EditableElement): void {
    if (target === this.selected) {
      this.selector = createStableSelector(target);
      this.refreshGuidelines();
      this.moveable.updateRect();
      this.updatePanel();
    }
  }

  private captureGesture(target: EditableElement, properties: string[]): void {
    this.gestureBefore.clear();
    for (const property of properties) {
      this.gestureBefore.set(property, inlineStyleValue(target, property));
    }
  }

  private commitGesture(target: EditableElement, properties: string[]): void {
    const selector = createStableSelector(target);
    for (const property of properties) {
      const before = this.gestureBefore.get(property) ?? null;
      const after = inlineStyleValue(target, property);
      this.commitPatch({
        selector,
        source: "manual",
        action: "set_style",
        property,
        before,
        after
      });
    }
    this.gestureBefore.clear();
    this.refreshAfterChange(target);
  }

  private commitPatch(patch: PatchEvent): void {
    if (patch.before === patch.after) {
      return;
    }
    if (this.historyCursor < this.history.length) {
      this.history.splice(this.historyCursor);
    }
    this.history.push(patch);
    this.historyCursor = this.history.length;
    this.updateHistoryButtons();
    void this.emitPatch(patch);
  }

  private async emitPatch(patch: PatchEvent): Promise<void> {
    if (!window.__wda_emit) {
      this.setStatus("Bridge Python indisponível; alteração mantida apenas na página.", "error");
      return;
    }
    try {
      const result = await window.__wda_emit({ type: "patch", patch });
      if (!result.ok) {
        this.setStatus(result.error ?? "Falha ao persistir patch.", "error");
      }
    } catch (error) {
      this.setStatus(`Falha ao persistir patch: ${errorMessage(error)}`, "error");
    }
  }

  private undo(): void {
    if (this.historyCursor <= 0) {
      return;
    }
    const patch = this.history[this.historyCursor - 1];
    if (!patch) {
      return;
    }
    this.historyCursor -= 1;
    this.applyHistoricalPatch(patch, patch.before ?? null);
    void this.emitPatch({
      ...patch,
      source: "undo",
      before: patch.after ?? null,
      after: patch.before ?? null
    });
    this.updateHistoryButtons();
    this.setStatus("Alteração desfeita.", "success");
  }

  private redo(): void {
    if (this.historyCursor >= this.history.length) {
      return;
    }
    const patch = this.history[this.historyCursor];
    if (!patch) {
      return;
    }
    this.historyCursor += 1;
    this.applyHistoricalPatch(patch, patch.after ?? null);
    void this.emitPatch({
      ...patch,
      source: "redo",
      before: patch.before ?? null,
      after: patch.after ?? null
    });
    this.updateHistoryButtons();
    this.setStatus("Alteração refeita.", "success");
  }

  private applyHistoricalPatch(patch: PatchEvent, value: string | null): void {
    const target = safeQuerySelector(patch.selector);
    if (!(target instanceof HTMLElement || target instanceof SVGElement)) {
      this.setStatus(`Seletor não encontrado para histórico: ${patch.selector}`, "error");
      return;
    }

    if (patch.action === "set_style" && patch.property) {
      const cssProperty = camelToKebab(patch.property);
      if (value === null) {
        target.style.removeProperty(cssProperty);
      } else {
        target.style.setProperty(cssProperty, value);
      }
    } else if (patch.action === "set_text") {
      target.textContent = value ?? "";
    } else if (patch.action === "set_attribute" && patch.property) {
      if (value === null) {
        target.removeAttribute(patch.property);
      } else {
        target.setAttribute(patch.property, value);
      }
    }
    this.refreshAfterChange(target);
  }

  private updateHistoryButtons(): void {
    this.undoButton.disabled = this.historyCursor <= 0;
    this.redoButton.disabled = this.historyCursor >= this.history.length;
  }

  private async applyPrompt(): Promise<void> {
    if (!this.selected) {
      return;
    }
    const prompt = this.fields.prompt.value.trim();
    if (!prompt) {
      this.setStatus("Digite um prompt.", "error");
      return;
    }
    if (!window.__wda_ai_edit) {
      this.setStatus("Bridge de IA indisponível.", "error");
      return;
    }

    this.promptButton.disabled = true;
    this.promptButton.textContent = "Gerando plano...";
    this.setStatus("Consultando Gemma localmente...");
    try {
      const request: AIEditRequest = {
        prompt,
        context: buildElementContext(this.selected, this.selector)
      };
      const plan = await window.__wda_ai_edit(request);
      this.validatePlanClientSide(plan);
      for (const action of plan.actions) {
        if (!this.selected) {
          break;
        }
        if (action.type === "set_style") {
          this.applyStyle(this.selected, action.property, action.value, "ai");
        } else if (action.type === "set_text") {
          this.applyText(this.selected, action.value, "ai");
        } else {
          this.applyAttribute(this.selected, action.name, action.value, "ai");
        }
      }
      const warningText = plan.warnings.length ? `\nAvisos: ${plan.warnings.join("; ")}` : "";
      this.setStatus(`${plan.summary}${warningText}`, "success");
    } catch (error) {
      this.setStatus(`Falha no plano de IA: ${errorMessage(error)}`, "error");
    } finally {
      this.promptButton.disabled = false;
      this.promptButton.textContent = "Aplicar com Gemma";
    }
  }

  private validatePlanClientSide(plan: EditPlan): void {
    if (!plan || !Array.isArray(plan.actions) || plan.actions.length === 0) {
      throw new Error("plano vazio ou inválido");
    }
    for (const action of plan.actions) {
      if (action.type === "set_style") {
        if (!ALLOWED_AI_STYLE_PROPERTIES.has(action.property)) {
          throw new Error(`propriedade não permitida: ${action.property}`);
        }
        assertSafeValue(action.value);
      } else if (action.type === "set_text") {
        if (action.value.length > 5000) {
          throw new Error("texto excede o limite");
        }
      } else if (action.type === "set_attribute") {
        if (!ALLOWED_AI_ATTRIBUTES.has(action.name)) {
          throw new Error(`atributo não permitido: ${action.name}`);
        }
        assertSafeValue(action.value, false);
      } else {
        throw new Error("tipo de ação não permitido");
      }
    }
  }

  private canEditText(element: EditableElement): boolean {
    const tag = element.tagName.toLowerCase();
    return !["img", "svg", "path", "input", "textarea", "select", "video", "canvas"].includes(tag);
  }

  private beginDirectTextEdit(element: EditableElement): void {
    this.textEditCleanup?.();
    const before = element.textContent;
    const previous = element.getAttribute("contenteditable");
    element.setAttribute("contenteditable", "true");
    if (element instanceof HTMLElement) {
      element.focus({ preventScroll: true });
    }

    let closed = false;
    const cleanup = (): void => {
      if (closed) {
        return;
      }
      closed = true;
      element.removeEventListener("blur", cleanup);
      element.removeEventListener("keydown", onKeyDown);
      if (previous === null) {
        element.removeAttribute("contenteditable");
      } else {
        element.setAttribute("contenteditable", previous);
      }
      this.textEditCleanup = null;
      this.commitPatch({
        selector: createStableSelector(element),
        source: "manual",
        action: "set_text",
        property: null,
        before,
        after: element.textContent
      });
      this.refreshAfterChange(element);
    };
    const onKeyDown: EventListener = (rawEvent): void => {
      const event = rawEvent as KeyboardEvent;
      if (event.key === "Escape") {
        element.textContent = before;
        cleanup();
      } else if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        cleanup();
      }
    };
    element.addEventListener("blur", cleanup, { once: true });
    element.addEventListener("keydown", onKeyDown);
    this.textEditCleanup = cleanup;
    this.setStatus("Edição direta de texto ativa. Enter confirma; Escape cancela.", "success");
  }

  private refreshGeometry(): void {
    this.moveable.verticalGuidelines = this.viewportVerticalGuidelines();
    this.moveable.horizontalGuidelines = this.viewportHorizontalGuidelines();
    this.refreshGuidelines();
    this.moveable.updateRect();
  }

  private refreshGuidelines(): void {
    this.moveable.elementGuidelines = collectElementGuidelines(this.selected);
  }

  private viewportVerticalGuidelines(): number[] {
    return [window.scrollX + window.innerWidth / 2];
  }

  private viewportHorizontalGuidelines(): number[] {
    return [window.scrollY + window.innerHeight / 2];
  }

  private setStatus(message: string, kind: "error" | "success" | "" = ""): void {
    this.status.textContent = message;
    this.status.dataset.kind = kind;
  }
}

function createStableSelector(element: Element): string {
  if (element.id) {
    const byId = `#${escapeCss(element.id)}`;
    if (isUniqueSelector(byId, element)) {
      return byId;
    }
  }

  for (const attribute of ["data-testid", "data-test", "data-cy", "name"]) {
    const value = element.getAttribute(attribute);
    if (!value) {
      continue;
    }
    const candidate = `${element.tagName.toLowerCase()}[${attribute}="${escapeCssString(value)}"]`;
    if (isUniqueSelector(candidate, element)) {
      return candidate;
    }
  }

  const classCandidate = selectorSegment(element, false);
  if (isUniqueSelector(classCandidate, element)) {
    return classCandidate;
  }

  const segments: string[] = [];
  let current: Element | null = element;
  while (current && current !== document.documentElement) {
    const segment = selectorSegment(current, true);
    segments.unshift(segment);
    const candidate = segments.join(" > ");
    if (isUniqueSelector(candidate, element)) {
      return candidate;
    }
    current = current.parentElement;
  }

  return segments.join(" > ") || element.tagName.toLowerCase();
}

function selectorSegment(element: Element, includeNth: boolean): string {
  const tag = element.tagName.toLowerCase();
  if (element.id) {
    return `#${escapeCss(element.id)}`;
  }

  const classes = Array.from(element.classList)
    .filter(isStableClassName)
    .slice(0, 3)
    .map((item) => `.${escapeCss(item)}`)
    .join("");
  let segment = `${tag}${classes}`;

  if (includeNth && element.parentElement) {
    const sameTag = Array.from(element.parentElement.children).filter(
      (sibling) => sibling.tagName === element.tagName
    );
    if (sameTag.length > 1) {
      const index = sameTag.indexOf(element) + 1;
      segment += `:nth-of-type(${index})`;
    }
  }
  return segment;
}

function isStableClassName(value: string): boolean {
  if (!value || value.length > 64 || value.startsWith("moveable-")) {
    return false;
  }
  const compact = value.replace(/[-_]/g, "");
  return !/[a-f0-9]{10,}/i.test(compact);
}

function isUniqueSelector(selector: string, element: Element): boolean {
  try {
    const matches = document.querySelectorAll(selector);
    return matches.length === 1 && matches[0] === element;
  } catch {
    return false;
  }
}

function safeQuerySelector(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

function escapeCss(value: string): string {
  if (globalThis.CSS?.escape) {
    return globalThis.CSS.escape(value);
  }
  return value.replace(/[^a-zA-Z0-9_-]/g, (character) => `\\${character}`);
}

function escapeCssString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function collectElementGuidelines(target: EditableElement | null): Element[] {
  const result: Element[] = [];
  const viewportBuffer = 250;
  const candidates = document.querySelectorAll("body *");
  for (const element of candidates) {
    if (result.length >= MAX_GUIDELINES) {
      break;
    }
    if (element === target || element.id === HOST_ID || element.hasAttribute("data-wda-editor-ui")) {
      continue;
    }
    if (element.closest(`#${HOST_ID}, .moveable-control-box, .wda-moveable`)) {
      continue;
    }
    if (target && (element.contains(target) || target.contains(element))) {
      continue;
    }
    const rect = element.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) {
      continue;
    }
    if (
      rect.bottom < -viewportBuffer
      || rect.top > window.innerHeight + viewportBuffer
      || rect.right < -viewportBuffer
      || rect.left > window.innerWidth + viewportBuffer
    ) {
      continue;
    }
    const style = getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      continue;
    }
    result.push(element);
  }
  return result;
}

function buildElementContext(element: EditableElement, selector: string): ElementContext {
  const rect = element.getBoundingClientRect();
  const computed = getComputedStyle(element);
  const attributes: Record<string, string> = {};
  for (const attribute of Array.from(element.attributes).slice(0, 40)) {
    if (attribute.name === "style" || attribute.name.startsWith("on")) {
      continue;
    }
    attributes[attribute.name] = attribute.value.slice(0, 1000);
  }

  const styles: Record<string, string> = {};
  for (const property of STYLE_CONTEXT_PROPERTIES) {
    styles[property] = computed[property];
  }

  const ancestors: string[] = [];
  let current = element.parentElement;
  while (current && ancestors.length < 8) {
    ancestors.push(summarizeElement(current));
    current = current.parentElement;
  }

  return {
    selector,
    tag_name: element.tagName.toLowerCase(),
    text: (element.textContent ?? "").trim().slice(0, 5000),
    attributes,
    styles,
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom,
      left: rect.left
    },
    ancestors
  };
}

function summarizeElement(element: Element): string {
  const id = element.id ? `#${element.id}` : "";
  const classes = Array.from(element.classList).slice(0, 3).map((item) => `.${item}`).join("");
  return `${element.tagName.toLowerCase()}${id}${classes}`.slice(0, 300);
}

function inlineStyleValue(element: EditableElement, property: string): string | null {
  const value = element.style.getPropertyValue(camelToKebab(property));
  return value === "" ? null : value;
}

function camelToKebab(value: string): string {
  return value.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`);
}

function numericCssValue(value: string): string {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? String(Math.round(parsed * 100) / 100) : "";
}

function cssColorToHex(value: string, fallback: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized === "transparent" || normalized === "rgba(0, 0, 0, 0)") {
    return fallback;
  }
  if (/^#[0-9a-f]{6}$/i.test(normalized)) {
    return normalized;
  }
  const match = normalized.match(/rgba?\(([^)]+)\)/);
  if (!match?.[1]) {
    return fallback;
  }
  const channels = match[1].split(",").slice(0, 3).map((channel) => Number.parseFloat(channel.trim()));
  if (channels.length !== 3 || channels.some((channel) => !Number.isFinite(channel))) {
    return fallback;
  }
  return `#${channels.map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0")).join("")}`;
}

function extractRotationDegrees(transform: string): number {
  if (!transform || transform === "none") {
    return 0;
  }
  try {
    const matrix = new DOMMatrixReadOnly(transform);
    return Math.atan2(matrix.b, matrix.a) * (180 / Math.PI);
  } catch {
    return 0;
  }
}

function replaceRotation(transform: string, degrees: number): string {
  const rotation = `rotate(${degrees}deg)`;
  const cleaned = transform.trim();
  if (!cleaned || cleaned === "none") {
    return rotation;
  }
  const rotationPattern = /rotate(?:Z)?\([^)]*\)/i;
  if (rotationPattern.test(cleaned)) {
    return cleaned.replace(rotationPattern, rotation);
  }
  return `${cleaned} ${rotation}`;
}

function assertSafeValue(value: string, rejectUrl = true): void {
  const lowered = value.toLowerCase();
  for (const fragment of FORBIDDEN_VALUE_FRAGMENTS) {
    if (!rejectUrl && fragment === "url(") {
      continue;
    }
    if (lowered.includes(fragment)) {
      throw new Error("valor contém fragmento não permitido");
    }
  }
  if (value.includes("<") || value.includes(">")) {
    throw new Error("markup não permitido");
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

function boot(): void {
  if (window.top !== window || window.__WDA_EDITOR_ACTIVE__) {
    return;
  }
  window.__WDA_EDITOR_ACTIVE__ = true;
  try {
    new VisualEditor();
  } catch (error) {
    window.__WDA_EDITOR_ACTIVE__ = false;
    console.error("[WebDesign AI Editor] bootstrap failed", error);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot, { once: true });
} else {
  boot();
}
