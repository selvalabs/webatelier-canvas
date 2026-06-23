(() => {
  "use strict";
  if (window.__WDA_ELEMENT_CATALOG__) return;
  window.__WDA_ELEMENT_CATALOG__ = [
    { id: "text", label: "Texto", node: { tag: "p", text: "Novo texto", styles: { margin: "0", lineHeight: "1.5" } } },
    { id: "heading", label: "Título", node: { tag: "h2", text: "Novo título", styles: { margin: "0", fontSize: "32px", lineHeight: "1.15" } } },
    { id: "button", label: "Botão", node: { tag: "button", text: "Nova ação", attributes: { type: "button" }, styles: { padding: "12px 18px", borderRadius: "10px", borderWidth: "0", fontWeight: "700" } } },
    { id: "image", label: "Imagem", node: { tag: "img", attributes: { src: "https://placehold.co/640x360", alt: "Imagem adicionada no editor", loading: "lazy" }, styles: { width: "100%", height: "auto", objectFit: "cover", borderRadius: "12px" } } },
    { id: "box", label: "Caixa", node: { tag: "div", styles: { minHeight: "120px", padding: "20px", borderRadius: "12px", borderWidth: "1px", borderStyle: "solid", borderColor: "#cbd5e1" } } },
    { id: "section", label: "Seção", node: { tag: "section", styles: { padding: "48px 24px" }, children: [{ tag: "h2", text: "Título da seção", styles: { margin: "0" } }, { tag: "p", text: "Adicione conteúdo para esta nova seção.", styles: { marginTop: "12px", marginBottom: "0" } }] } },
    { id: "card", label: "Card", node: { tag: "article", styles: { padding: "24px", borderRadius: "16px", borderWidth: "1px", borderStyle: "solid", borderColor: "#e2e8f0", boxShadow: "0 12px 30px rgb(15 23 42 / 12%)" }, children: [{ tag: "h3", text: "Novo card", styles: { margin: "0" } }, { tag: "p", text: "Descrição do conteúdo do card.", styles: { marginTop: "8px", marginBottom: "0" } }] } },
    { id: "flex", label: "Flex", node: { tag: "div", styles: { display: "flex", gap: "16px", alignItems: "center", padding: "16px" }, children: [{ tag: "div", text: "Item 1", styles: { padding: "12px" } }, { tag: "div", text: "Item 2", styles: { padding: "12px" } }] } },
    { id: "grid", label: "Grid", node: { tag: "div", styles: { display: "grid", gap: "16px", padding: "16px" }, children: [{ tag: "div", text: "Item 1", styles: { padding: "12px" } }, { tag: "div", text: "Item 2", styles: { padding: "12px" } }, { tag: "div", text: "Item 3", styles: { padding: "12px" } }] } },
    { id: "list", label: "Lista", node: { tag: "ul", styles: { margin: "0", paddingLeft: "24px" }, children: [{ tag: "li", text: "Primeiro item" }, { tag: "li", text: "Segundo item" }, { tag: "li", text: "Terceiro item" }] } }
  ];
})();
