# Especificação funcional e técnica

## 1. Inicialização

### SPEC-001 Launcher

O comando `wda launch --url <URL>` deve:

1. validar a URL;
2. criar um identificador de sessão;
3. localizar o bundle do runtime;
4. abrir Chromium com `headless=False`;
5. expor os bindings antes da navegação;
6. adicionar o runtime como init script;
7. navegar para a URL;
8. aguardar fechamento do browser ou interrupção do processo.

### SPEC-002 Navegação

O runtime deve ser reinicializado após navegações completas e não deve criar duas instâncias na mesma página.

## 2. Seleção

### SPEC-010 Modo edição

No modo edição, um clique capturado seleciona o elemento mais próximo que:

- seja `HTMLElement` ou `SVGElement` suportado;
- não pertença ao editor;
- esteja visível;
- não seja `html`, `head`, `script`, `style`, `meta` ou `link`.

### SPEC-011 Modo interação

No modo interação, cliques e teclado devem chegar à página normalmente. `Alt+E` alterna os modos.

### SPEC-012 Seletor

A ordem de preferência é:

1. `id` único;
2. `data-testid`, `data-test`, `data-cy` ou `name` único;
3. tag + classes estáveis;
4. caminho ascendente com `:nth-of-type` quando necessário.

O seletor final deve resolver exatamente um elemento na página corrente.

## 3. Transformações

### SPEC-020 Drag

- atualização contínua durante o ponteiro;
- patch único ao final;
- `transform` é usado no MVP para reduzir impacto no fluxo do layout;
- snapping de bordas, centros e guidelines deve permanecer ativo.

### SPEC-021 Resize

- oito direções visíveis;
- largura e altura mínimas de 1 px;
- `width`, `height` e, quando necessário, `transform` devem ser registrados;
- `Shift` pode preservar proporção quando suportado pelo Moveable.

### SPEC-022 Rotate

- handle acima do elemento;
- rotação em graus;
- patch de `transform` ao final;
- painel deve refletir o valor aproximado.

## 4. Smart guides

### SPEC-030 Fontes de alinhamento

- centro vertical da viewport;
- centro horizontal da viewport;
- left, right, top, bottom, center e middle dos elementos elegíveis;
- gaps equivalentes quando disponíveis.

### SPEC-031 Threshold

O padrão é 6 px e deve ser alterável futuramente por configuração.

### SPEC-032 Elegibilidade

Elementos referência devem:

- estar visíveis;
- possuir retângulo maior que 2 x 2 px;
- não ser ancestral ou descendente direto do alvo quando isso causar ruído;
- não pertencer à UI do editor;
- respeitar limite máximo de 300 guidelines no MVP.

## 5. Painel manual

### SPEC-040 Campos mínimos

- texto;
- width e height;
- rotação;
- font-family;
- font-size;
- font-weight;
- color;
- background-color;
- opacity;
- text-align;
- border-radius;
- prompt;
- undo/redo;
- toggle editar/interagir.

### SPEC-041 Atualização

O painel lê `getComputedStyle`, mas os patches preservam o estado inline anterior para permitir undo sem sobrescrever a cascata original.

### SPEC-042 Edição direta de texto

Duplo clique habilita `contenteditable` temporariamente. O atributo anterior deve ser restaurado após blur e apenas uma alteração deve ser registrada.

## 6. IA

### SPEC-050 Entrada

O request contém:

- prompt do usuário;
- seletor;
- tag;
- texto limitado;
- atributos allowlisted;
- retângulo;
- subconjunto de estilos computados;
- ancestrais resumidos.

### SPEC-051 Saída

A saída deve validar o seguinte modelo conceitual:

```json
{
  "summary": "descrição breve",
  "actions": [
    {"type": "set_style", "property": "fontSize", "value": "48px"},
    {"type": "set_text", "value": "Novo título"}
  ],
  "warnings": []
}
```

### SPEC-052 Ações aceitas

- `set_style` para propriedades allowlisted;
- `set_text` para texto simples;
- `set_attribute` para atributos allowlisted.

Não são aceitos JavaScript, event handlers, HTML arbitrário ou comandos de sistema.

### SPEC-053 Falhas

Timeout, modelo ausente, JSON inválido ou ação proibida devem gerar erro legível sem desabilitar o editor manual.

## 7. Persistência

### SPEC-060 JSONL

Cada patch ocupa uma linha JSON e contém ID, sessão, URL, seletor, origem, ação, propriedade opcional, before, after e timestamp.

### SPEC-061 Diretório

O padrão usa o diretório de dados da aplicação do sistema operacional, não a raiz do projeto editado.

## 8. API

### SPEC-070 Endpoints MVP

- `GET /health`;
- `POST /api/v1/ai/edits`;
- `POST /api/v1/patches`;
- `GET /api/v1/patches/{session_id}`.

### SPEC-071 Bind

`wda serve` deve recusar host não-loopback sem a flag explícita `--allow-remote`. Mesmo com essa flag, a documentação deve indicar que o MVP não está pronto para exposição pública.

## 9. Compatibilidade

- Chromium gerenciado pelo Playwright;
- páginas HTML tradicionais e SPAs;
- Shadow DOM da página: suporte parcial;
- iframes same-origin: futuro próximo;
- iframes cross-origin: fora do MVP.
