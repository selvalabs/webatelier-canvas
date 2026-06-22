# WebDesign AI Editor

Editor visual local-first para projetos web. A aplicação abre uma página em um Chromium headed por meio do Playwright, injeta uma camada de edição visual e permite alterar elementos manualmente ou por prompt usando Gemma 4 via Ollama.

## Estado do projeto

Este repositório começa com:

- documentação de produto, arquitetura, sprints e QA;
- núcleo Python organizado por portas e adaptadores;
- launcher headed com Playwright;
- runtime TypeScript injetável;
- seleção visual de elementos;
- mover, redimensionar e rotacionar;
- smart guides, snapping de bordas/centros e indicação de distância;
- painel manual para texto, dimensões, tipografia, cores, opacidade, alinhamento e bordas;
- histórico local de undo/redo;
- persistência de patches em JSONL;
- integração inicial com Ollama usando saída JSON estruturada;
- API FastAPI preparada para evolução futura como webservice;
- CI para lint, testes, typecheck e build do runtime.

O código é um MVP vertical. Antes de mergear, execute toda a validação local e faça a revisão manual descrita em `docs/QA_PLAN.md`.

## Requisitos

- Python 3.11 ou superior;
- `uv`;
- Node.js 20 ou superior, somente para desenvolver/recompilar o runtime;
- Ollama em execução local;
- um modelo Gemma disponível no Ollama, por padrão `gemma4`;
- projeto web acessível por URL, normalmente `http://127.0.0.1:<porta>`.

## Instalação local

```powershell
uv sync --extra dev
uv run playwright install chromium
npm ci --prefix editor-runtime
npm run --prefix editor-runtime build
Copy-Item .env.example .env
```

Confira os modelos disponíveis:

```powershell
ollama list
```

Edite `.env` se o nome instalado for diferente de `gemma4`.

## Uso

Primeiro execute o projeto web que será editado. Depois:

```powershell
uv run wda doctor
uv run wda launch --url http://127.0.0.1:3000
```

O Chromium será aberto em modo headed. Clique em um elemento para selecioná-lo. O painel lateral permite edição manual e por prompt.

Atalhos principais:

- `Escape`: desmarcar elemento;
- `Ctrl+Z`: desfazer;
- `Ctrl+Shift+Z` ou `Ctrl+Y`: refazer;
- `Alt+E`: alternar entre modo editar e modo interagir com a página;
- duplo clique em texto: edição textual direta.

## API local e futura camada de serviço

O modo local usa bindings do Playwright para comunicação direta e não precisa expor uma porta de rede. A mesma camada de aplicação também pode ser iniciada como API:

```powershell
uv run wda serve --host 127.0.0.1 --port 8787
```

O host padrão é exclusivamente local. Exposição remota exige autenticação, autorização, isolamento de sessões e TLS; consulte `docs/LOCAL_FIRST_AND_WEBSERVICE.md` e `docs/THREAT_MODEL.md`.

## Validação

```powershell
./scripts/validate.ps1
```

Ou manualmente:

```powershell
uv run ruff check . --fix
uv run ruff check .
uv run pytest
uv run mypy src
npm run --prefix editor-runtime typecheck
npm run --prefix editor-runtime build
```

## Fluxo GitHub

O fluxo obrigatório é:

```text
Issue -> Branch -> Implementação local -> Validação local -> Commit -> Push -> PR -> CI -> Revisão -> Merge -> Sync local
```

Consulte `CONTRIBUTING.md` e `docs/DEFINITION_OF_DONE.md`.

## Escopo atual

O MVP salva patches de estilo, texto e atributos. Ele ainda não reescreve automaticamente JSX, Vue SFC, templates ou folhas CSS originais. Essa etapa está planejada como exportadores específicos por stack.

## Documentação de governança

- `docs/DEVELOPMENT_GOVERNANCE.md`: adaptação do fluxo assistido por IA ao projeto;
- `docs/PATCH_DELIVERY.md`: padrão de ZIP, aplicador, backup e reversão;
- `AGENTS.md`: limites operacionais para assistentes de código.

## Demo incluída

Em um terminal:

```powershell
./scripts/run-demo.ps1
```

Em outro terminal:

```powershell
uv run wda launch --url http://127.0.0.1:4173
```
