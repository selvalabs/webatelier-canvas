(() => {
  "use strict";
  if (window.__WDA_CSS_PROPERTY_CATALOG__) return;

  window.__WDA_CSS_PROPERTY_CATALOG__ = [
    { group: "Tipografia", css: "font-size", property: "fontSize", min: 8, max: 96, step: 1, unit: "px", explanation: "Controla o tamanho visual das letras.", example: "font-size: 32px" },
    { group: "Tipografia", css: "font-weight", property: "fontWeight", min: 100, max: 900, step: 100, unit: "", explanation: "Define o peso ou espessura dos caracteres.", example: "font-weight: 700" },
    { group: "Tipografia", css: "line-height", property: "lineHeight", min: 0.8, max: 3, step: 0.05, unit: "", explanation: "Ajusta a distância vertical entre linhas de texto.", example: "line-height: 1.5" },
    { group: "Tipografia", css: "letter-spacing", property: "letterSpacing", min: -2, max: 20, step: 0.1, unit: "px", explanation: "Aumenta ou reduz o espaço entre caracteres.", example: "letter-spacing: 0.5px" },
    { group: "Espaçamento", css: "padding", property: "padding", min: 0, max: 96, step: 1, unit: "px", explanation: "Cria espaço interno entre conteúdo e borda.", example: "padding: 24px" },
    { group: "Espaçamento", css: "margin", property: "margin", min: -48, max: 96, step: 1, unit: "px", explanation: "Cria espaço externo ao redor do elemento.", example: "margin: 16px" },
    { group: "Espaçamento", css: "gap", property: "gap", min: 0, max: 96, step: 1, unit: "px", explanation: "Define o espaço entre itens de flex ou grid.", example: "gap: 12px" },
    { group: "Dimensão", css: "width", property: "width", min: 1, max: 1200, step: 1, unit: "px", explanation: "Define a largura inline do elemento.", example: "width: 320px" },
    { group: "Dimensão", css: "height", property: "height", min: 1, max: 800, step: 1, unit: "px", explanation: "Define a altura inline do elemento.", example: "height: 240px" },
    { group: "Decoração", css: "border-radius", property: "borderRadius", min: 0, max: 100, step: 1, unit: "px", explanation: "Arredonda os cantos da caixa.", example: "border-radius: 16px" },
    { group: "Decoração", css: "opacity", property: "opacity", min: 0, max: 1, step: 0.01, unit: "", explanation: "Controla a transparência de 0 a 1.", example: "opacity: 0.8" },
    { group: "Camadas", css: "z-index", property: "zIndex", min: -10, max: 100, step: 1, unit: "", explanation: "Controla a ordem de empilhamento quando o posicionamento permite.", example: "z-index: 10" },
    { group: "Transformação", css: "transform: rotate", property: "transform", kind: "rotate", min: -180, max: 180, step: 1, unit: "deg", explanation: "Rotaciona o elemento sem alterar o fluxo do layout.", example: "transform: rotate(12deg)" },
    { group: "Decoração", css: "box-shadow", property: "boxShadow", kind: "text", explanation: "Adiciona sombra à caixa com deslocamento, blur e cor.", example: "box-shadow: 0 12px 30px rgb(0 0 0 / 20%)" },
    { group: "Layout", css: "display", property: "display", kind: "select", options: ["block", "inline", "inline-block", "flex", "grid", "none"], explanation: "Escolhe o modelo principal de layout do elemento.", example: "display: flex" },
    { group: "Layout", css: "justify-content", property: "justifyContent", kind: "select", options: ["flex-start", "center", "flex-end", "space-between", "space-around", "space-evenly"], explanation: "Distribui itens no eixo principal de flex/grid.", example: "justify-content: center" },
    { group: "Layout", css: "align-items", property: "alignItems", kind: "select", options: ["stretch", "flex-start", "center", "flex-end", "baseline"], explanation: "Alinha itens no eixo transversal de flex/grid.", example: "align-items: center" }
  ];
})();
