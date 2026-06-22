# PRD - WebDesign AI Editor

## 1. Resumo

O WebDesign AI Editor é uma aplicação local-first que abre projetos web em um navegador real, permite selecionar e manipular elementos visualmente e oferece edição assistida por linguagem natural com Gemma 4 executada localmente pelo Ollama.

O produto combina:

- fidelidade de renderização do navegador real;
- edição manual semelhante a ferramentas de design;
- manipulação baseada no DOM e em seletores;
- patches rastreáveis e reversíveis;
- assistência de IA local;
- arquitetura pronta para evoluir a um webservice multiusuário.

## 2. Problema

Ferramentas de webdesign normalmente se dividem em dois grupos:

1. editores visuais que abstraem ou geram código próprio;
2. assistentes de código que alteram arquivos sem uma interação visual direta sobre a página renderizada.

O usuário precisa editar uma página real, com feedback imediato, sem abandonar a possibilidade de controle manual e sem depender obrigatoriamente de um serviço de IA externo.

## 3. Visão do produto

Permitir que uma pessoa abra qualquer projeto web local, clique em um elemento e o edite por mouse, painel de propriedades ou prompt, preservando histórico, reversibilidade e um caminho claro para levar mudanças ao código-fonte.

## 4. Princípios

- **Local-first:** navegador, patches e IA funcionam na máquina do usuário.
- **Controle humano:** IA propõe ações limitadas e revisáveis; não faz commit ou merge.
- **Manual e IA são equivalentes:** ambos produzem o mesmo modelo de patch.
- **Não destrutivo:** undo/redo e persistência registram o que mudou.
- **Navegador real:** a fonte de verdade visual é o Chromium headed.
- **Evolução incremental:** exportadores de código e webservice entram por adaptadores.
- **Segurança por padrão:** bind local, allowlist de propriedades e ausência de HTML arbitrário no MVP.

## 5. Personas

### 5.1 Desenvolvedor front-end

Deseja ajustar rapidamente layout e estilo, comparar resultados no navegador e transformar mudanças aprovadas em código revisável.

### 5.2 Designer com conhecimento web

Deseja manipular dimensões, alinhamentos, tipografia e conteúdo sem editar CSS manualmente a cada tentativa.

### 5.3 Criador independente

Deseja usar uma IA local para melhorar interfaces sem enviar o projeto a terceiros.

## 6. Objetivos do MVP

- abrir uma URL em Chromium headed;
- injetar editor sem modificar o projeto alvo;
- selecionar elementos por clique e gerar seletor estável;
- mover, redimensionar e rotacionar por handles;
- mostrar smart guides de viewport e de outros elementos;
- aplicar snapping de bordas, centros e gaps;
- editar texto e propriedades visuais por painel;
- receber prompt sobre o elemento selecionado;
- obter plano JSON estruturado do Ollama/Gemma;
- validar e aplicar ações permitidas;
- registrar patches manuais e de IA;
- oferecer undo/redo durante a sessão;
- persistir patches localmente;
- expor uma API local baseada nos mesmos serviços de aplicação.

## 7. Fora do escopo do MVP

- reescrita automática confiável de JSX, Vue SFC, Svelte ou templates server-side;
- colaboração em tempo real;
- autenticação multiusuário;
- hospedagem pública;
- geração irrestrita de HTML ou JavaScript pela IA;
- edição vetorial avançada;
- suporte completo a iframes cross-origin;
- garantia de que qualquer drag preserve a semântica do layout responsivo;
- sincronização bidirecional com Figma.

## 8. Casos de uso prioritários

### UC-01 Seleção visual

Dado que o navegador está em modo edição, quando o usuário clica em um elemento da página, o sistema destaca o elemento, mostra handles e atualiza o painel de propriedades.

### UC-02 Transformação por mouse

Quando o usuário arrasta, redimensiona ou rotaciona o elemento, a página atualiza em tempo real, exibe guias de alinhamento e registra um patch ao final da interação.

### UC-03 Edição manual

Quando o usuário altera texto, fonte, tamanho, cor, opacidade, dimensões, alinhamento ou borda, a alteração é aplicada imediatamente e registrada no histórico.

### UC-04 Edição por prompt

Quando o usuário descreve uma alteração, o sistema envia contexto limitado do elemento ao Ollama, recebe ações estruturadas, valida a allowlist e aplica somente ações válidas.

### UC-05 Desfazer e refazer

Quando o usuário usa os controles ou atalhos, o sistema restaura o valor anterior ou posterior sem perder o registro da sessão.

### UC-06 Evolução para webservice

O mesmo serviço de geração de plano e persistência deve poder ser chamado por HTTP sem depender da implementação Playwright local.

## 9. Requisitos funcionais

| ID | Requisito | Prioridade |
|---|---|---|
| FR-001 | Abrir URL em Chromium headed | Must |
| FR-002 | Reinjetar runtime após navegação | Must |
| FR-003 | Selecionar elemento por clique | Must |
| FR-004 | Gerar seletor CSS reproduzível | Must |
| FR-005 | Mover por drag | Must |
| FR-006 | Redimensionar por 8 handles | Must |
| FR-007 | Rotacionar por handle dedicado | Must |
| FR-008 | Mostrar guias de centro da viewport | Must |
| FR-009 | Mostrar guias de bordas/centros de elementos | Must |
| FR-010 | Snap configurável com distância padrão de 6 px | Must |
| FR-011 | Editar texto diretamente e pelo painel | Must |
| FR-012 | Editar propriedades tipográficas e visuais | Must |
| FR-013 | Registrar patch com before/after | Must |
| FR-014 | Undo/redo em memória | Must |
| FR-015 | Persistir patches em JSONL | Must |
| FR-016 | Chamar Ollama local com modelo configurável | Must |
| FR-017 | Exigir saída conforme JSON Schema | Must |
| FR-018 | Rejeitar propriedades e valores perigosos | Must |
| FR-019 | API de health, AI edit e patches | Should |
| FR-020 | Alternar entre editar e interagir | Must |
| FR-021 | Exportar patches para CSS/JSX | Later |
| FR-022 | Sessões remotas autenticadas | Later |

## 10. Requisitos não funcionais

- **Privacidade:** o modo padrão não envia conteúdo a serviços externos.
- **Latência manual:** feedback visual deve ocorrer dentro do frame de interação, idealmente abaixo de 16 ms por atualização.
- **Latência de seleção:** painel e handles devem aparecer em até 100 ms em páginas comuns.
- **Resiliência:** falha do Ollama não deve impedir edição manual.
- **Compatibilidade:** primeira plataforma suportada é Windows com Chromium; Linux e macOS entram na matriz após o MVP.
- **Observabilidade:** logs devem indicar sessão, URL, evento e erro sem registrar segredos.
- **Acessibilidade:** painel deve ser operável por teclado e possuir labels.
- **Manutenibilidade:** domínio, serviços e adaptadores não devem depender circularmente.

## 11. Métricas de sucesso

- usuário consegue abrir um projeto local e editar um elemento em menos de 3 minutos após instalação;
- 95% dos testes manuais P0 passam no Chromium suportado;
- undo restaura corretamente todas as propriedades suportadas no conjunto de QA;
- nenhuma ação de IA fora da allowlist é aplicada;
- falha do Ollama produz mensagem clara e mantém o editor operacional;
- pipeline CI passa em Python e TypeScript.

## 12. Riscos

| Risco | Impacto | Mitigação |
|---|---|---|
| Drag quebra layout responsivo | Alto | usar transform no MVP, avisos e exportadores conscientes de layout depois |
| CSS global do site conflita com o editor | Alto | Shadow DOM para painel e nomes prefixados |
| Seletores frágeis | Alto | preferência por id/data attributes e diagnóstico de unicidade |
| Modelo gera CSS inválido | Médio | JSON Schema, Pydantic e allowlist |
| Ollama indisponível | Médio | doctor, timeout e modo manual independente |
| Página muito grande degrada smart guides | Médio | filtro de visibilidade e limite de guidelines |
| Webservice exposto sem proteção | Crítico | bind local por padrão e gate de segurança antes de host remoto |

## 13. Critérios de aceite do MVP

- `uv run ruff check .` passa;
- `uv run pytest` passa;
- `uv run mypy src` passa;
- `npm run --prefix editor-runtime typecheck` passa;
- `npm run --prefix editor-runtime build` passa;
- teste manual confirma seleção, drag, resize, rotate, snapping, painel, undo/redo e prompt;
- patches são gravados fora do repositório por padrão;
- nenhuma credencial está presente no repositório;
- PR referencia a issue e CI está verde.
