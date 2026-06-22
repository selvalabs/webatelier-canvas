# Sprints

A duração sugerida é de uma semana por sprint. Cada item deve possuir issue, branch, validação local e PR próprio.

## Sprint 0 - Fundação e governança

**Objetivo:** criar repositório, documentação, estrutura, CI e contrato de patches.

Entregas:

- PRD, arquitetura, specs, QA e threat model;
- pyproject, runtime package e scripts;
- templates GitHub e workflow CI;
- domínio de ações e patches;
- repositório JSONL;
- vertical slice compilável.

Critérios:

- todos os comandos de validação passam;
- README permite setup em uma máquina limpa;
- nenhuma credencial no diff.

## Sprint 1 - Browser host e seleção

**Objetivo:** abrir projeto e selecionar elementos com estabilidade.

Entregas:

- launcher Playwright headed;
- init script persistente;
- binding browser/Python;
- seleção e destaque;
- seletor CSS único;
- modo editar/interagir.

QA P0:

- páginas estáticas e SPA;
- navegação/reload;
- elementos aninhados;
- páginas com CSS agressivo.

## Sprint 2 - Transformações e smart guides

**Objetivo:** interação espacial semelhante a editor visual.

Entregas:

- drag;
- oito handles de resize;
- rotate;
- guidelines de viewport e elementos;
- snapping e gaps;
- atualização em scroll/resize;
- patch único por gesto.

## Sprint 3 - Painel de propriedades

**Objetivo:** edição manual completa do conjunto MVP.

Entregas:

- texto;
- dimensões;
- tipografia;
- cores;
- opacidade;
- alinhamento;
- border radius;
- edição direta por duplo clique;
- acessibilidade de teclado.

## Sprint 4 - Histórico e persistência

**Objetivo:** edição não destrutiva e rastreável.

Entregas:

- undo/redo consistente;
- JSONL por sessão;
- exportação de patches;
- recuperação básica de sessão;
- diagnóstico de seletor não resolvido.

## Sprint 5 - IA local

**Objetivo:** transformar prompt em ações seguras.

Entregas:

- doctor do Ollama/modelo;
- JSON Schema;
- allowlists e sanitização;
- mensagens de erro;
- prompts de sistema;
- testes com respostas inválidas;
- opção de preview/aprovação antes de aplicar.

## Sprint 6 - QA e hardening

**Objetivo:** confiabilidade para uso diário.

Entregas:

- suíte E2E Playwright;
- fixtures de páginas;
- visual regression;
- performance de guidelines;
- tratamento de Shadow DOM/iframes same-origin;
- telemetria local opt-in;
- documentação de troubleshooting.

## Sprint 7 - Exportadores de código

**Objetivo:** transformar patches aprovados em alterações de fonte.

Entregas incrementais:

- CSS puro;
- HTML;
- Tailwind;
- React/JSX;
- Vue/Svelte.

Cada exportador deve produzir diff revisável e nunca sobrescrever código sem preview.

## Sprint 8 - Webservice runway

**Objetivo:** daemon local e preparação real para serviço remoto.

Entregas:

- WebSocket bridge;
- SQLite/PostgreSQL adapter;
- autenticação local/protótipo;
- sessões múltiplas;
- browser worker abstraction;
- threat model atualizado;
- decisão go/no-go para exposição privada.
