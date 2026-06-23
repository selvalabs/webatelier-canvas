(() => {
  "use strict";
  if (window.__WDA_JS_TOOL_REGISTRY__) return;

  const field = (id, label, value, maxLength = 120) => ({ id, label, value, maxLength });
  const textNode = (tag, text, className = "", styles = {}) => ({
    tag,
    text,
    attributes: className ? { class: className } : {},
    styles,
    children: []
  });

  window.__WDA_JS_TOOL_REGISTRY__ = [
    {
      id: "accordion",
      label: "Accordion",
      description: "Cria uma pergunta expansível com comportamento interno controlado.",
      fields: [field("title", "Pergunta", "O que está incluído?"), field("content", "Resposta", "Edite esta resposta no painel ou diretamente na página.", 500)],
      build(values) {
        return {
          tag: "section",
          attributes: { class: "wda-tool-accordion", role: "region", "aria-label": values.title },
          styles: { borderWidth: "1px", borderStyle: "solid", borderColor: "#cbd5e1", borderRadius: "12px", overflow: "hidden" },
          children: [
            { tag: "button", text: values.title, attributes: { class: "wda-tool-accordion-trigger", type: "button", "aria-label": `Alternar ${values.title}` }, styles: { display: "block", width: "100%", padding: "16px", borderWidth: "0", textAlign: "left", fontWeight: "700", backgroundColor: "#f8fafc" } },
            { tag: "div", text: values.content, attributes: { class: "wda-tool-accordion-panel" }, styles: { display: "none", padding: "16px", lineHeight: "1.6" } }
          ]
        };
      }
    },
    {
      id: "tabs",
      label: "Tabs",
      description: "Insere duas abas acessíveis com troca de conteúdo por delegação interna.",
      fields: [field("first", "Primeira aba", "Visão geral"), field("second", "Segunda aba", "Detalhes")],
      build(values) {
        return {
          tag: "section",
          attributes: { class: "wda-tool-tabs", role: "region", "aria-label": "Conteúdo em abas" },
          styles: { borderWidth: "1px", borderStyle: "solid", borderColor: "#cbd5e1", borderRadius: "12px", padding: "16px" },
          children: [
            { tag: "div", attributes: { class: "wda-tool-tabs-buttons", role: "tablist" }, styles: { display: "flex", gap: "8px", marginBottom: "16px" }, children: [
              { tag: "button", text: values.first, attributes: { class: "wda-tool-tab-button", type: "button", role: "tab" }, styles: { padding: "10px 14px", borderRadius: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#94a3b8", fontWeight: "700" } },
              { tag: "button", text: values.second, attributes: { class: "wda-tool-tab-button", type: "button", role: "tab" }, styles: { padding: "10px 14px", borderRadius: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#94a3b8", fontWeight: "700" } }
            ] },
            { tag: "div", text: `Conteúdo de ${values.first}`, attributes: { class: "wda-tool-tab-panel", role: "tabpanel" }, styles: { display: "block", lineHeight: "1.6" } },
            { tag: "div", text: `Conteúdo de ${values.second}`, attributes: { class: "wda-tool-tab-panel", role: "tabpanel" }, styles: { display: "none", lineHeight: "1.6" } }
          ]
        };
      }
    },
    {
      id: "modal",
      label: "Modal",
      description: "Adiciona um botão e uma janela modal local sem código arbitrário.",
      fields: [field("button", "Texto do botão", "Abrir detalhes"), field("title", "Título do modal", "Detalhes")],
      build(values) {
        return {
          tag: "div",
          attributes: { class: "wda-tool-modal-widget" },
          children: [
            { tag: "button", text: values.button, attributes: { class: "wda-tool-modal-open", type: "button" }, styles: { padding: "12px 18px", borderRadius: "10px", borderWidth: "0", fontWeight: "700" } },
            { tag: "div", attributes: { class: "wda-tool-modal-layer", role: "dialog", "aria-label": values.title }, styles: { display: "none", position: "fixed", top: "0", right: "0", bottom: "0", left: "0", zIndex: "9999", backgroundColor: "rgb(15 23 42 / 72%)", padding: "32px" }, children: [
              { tag: "article", styles: { maxWidth: "520px", margin: "48px auto", padding: "24px", borderRadius: "16px", backgroundColor: "#ffffff", color: "#0f172a" }, children: [
                textNode("h2", values.title, "", { margin: "0", fontSize: "28px" }),
                textNode("p", "Edite o conteúdo desta janela no canvas.", "", { marginTop: "12px", marginBottom: "20px", lineHeight: "1.6" }),
                { tag: "button", text: "Fechar", attributes: { class: "wda-tool-modal-close", type: "button" }, styles: { padding: "10px 14px", borderRadius: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#94a3b8" } }
              ] }
            ] }
          ]
        };
      }
    },
    {
      id: "mobile-menu",
      label: "Menu móvel",
      description: "Cria um menu expansível controlado por um único botão.",
      fields: [field("label", "Rótulo", "Menu"), field("items", "Itens separados por vírgula", "Início, Serviços, Contato", 240)],
      build(values) {
        const items = values.items.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 8);
        return {
          tag: "div",
          attributes: { class: "wda-tool-mobile-menu" },
          styles: { position: "relative" },
          children: [
            { tag: "button", text: values.label, attributes: { class: "wda-tool-menu-toggle", type: "button", "aria-label": `Alternar ${values.label}` }, styles: { padding: "10px 14px", borderRadius: "8px", borderWidth: "1px", borderStyle: "solid", borderColor: "#94a3b8", fontWeight: "700" } },
            { tag: "ul", attributes: { class: "wda-tool-menu-list" }, styles: { display: "none", position: "absolute", top: "48px", left: "0", minWidth: "200px", margin: "0", padding: "12px", borderRadius: "10px", backgroundColor: "#ffffff", boxShadow: "0 16px 40px rgb(15 23 42 / 18%)", zIndex: "50" }, children: items.map((item) => textNode("li", item, "", { padding: "8px", listStyle: "none" })) }
          ]
        };
      }
    },
    {
      id: "reveal",
      label: "Reveal on scroll",
      description: "Insere um bloco que aparece quando entra na área visível.",
      fields: [field("title", "Título", "Conteúdo em destaque"), field("content", "Texto", "Este bloco usa IntersectionObserver interno e seguro.", 500)],
      build(values) {
        return {
          tag: "article",
          attributes: { class: "wda-tool-reveal", role: "region", "aria-label": values.title },
          styles: { opacity: "0", transform: "translateY(18px)", padding: "24px", borderRadius: "14px", borderWidth: "1px", borderStyle: "solid", borderColor: "#cbd5e1" },
          children: [
            textNode("h3", values.title, "", { margin: "0", fontSize: "26px" }),
            textNode("p", values.content, "", { marginTop: "10px", marginBottom: "0", lineHeight: "1.6" })
          ]
        };
      }
    }
  ];
})();
