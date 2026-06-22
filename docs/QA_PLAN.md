# Plano de QA

## 1. Estratégia

A qualidade será validada em quatro camadas:

1. testes unitários Python;
2. typecheck e build TypeScript;
3. testes de integração entre domínio, Ollama mockado e persistência;
4. testes manuais/E2E no Chromium headed.

O CI confirma a validação local; não a substitui.

## 2. Ambientes

### P0

- Windows 11;
- Python 3.11+;
- Node 20+;
- Chromium do Playwright;
- Ollama local;
- Gemma configurada.

### P1 posterior

- Ubuntu atual;
- macOS atual;
- páginas React/Vite, HTML estático e Next em modo dev.

## 3. Comandos obrigatórios

```powershell
uv run ruff check . --fix
uv run ruff check .
uv run pytest
uv run mypy src
npm run --prefix editor-runtime typecheck
npm run --prefix editor-runtime build
```

## 4. Casos P0

| ID | Caso | Resultado esperado |
|---|---|---|
| QA-001 | Abrir URL válida | Chromium headed abre e runtime aparece |
| QA-002 | URL inválida | CLI termina com erro claro |
| QA-003 | Clicar em heading | heading selecionado e painel atualizado |
| QA-004 | Clicar dentro do painel | seleção da página não muda |
| QA-005 | Alt+E | alterna editar/interagir |
| QA-006 | Drag | elemento move e um patch é criado ao final |
| QA-007 | Resize em cada canto | width/height mudam sem valores negativos |
| QA-008 | Rotate | elemento gira e patch de transform é criado |
| QA-009 | Aproximar do centro | guideline aparece e snapping ocorre |
| QA-010 | Aproximar de outro elemento | bordas/centros alinham |
| QA-011 | Editar texto no painel | conteúdo muda e undo restaura |
| QA-012 | Duplo clique em texto | edição direta funciona e contenteditable é restaurado |
| QA-013 | Alterar fonte/cor | computed style muda e patch é registrado |
| QA-014 | Ctrl+Z / redo | valores anterior/posterior são restaurados |
| QA-015 | Prompt válido | plano é aplicado e identificado como AI |
| QA-016 | Ollama parado | erro aparece; edição manual continua |
| QA-017 | Modelo inexistente | doctor e prompt informam o problema |
| QA-018 | Resposta AI inválida | nenhuma ação é aplicada |
| QA-019 | CSS perigoso | valor é rejeitado |
| QA-020 | Reload | runtime volta sem duplicação |
| QA-021 | Fechar browser | processo termina limpo |
| QA-022 | Arquivo de patches | JSONL válido fora do repo |

## 5. Regressão visual

A partir do Sprint 6:

- manter fixtures em `examples/site`;
- capturar before/after em viewport fixa;
- mascarar timestamps e conteúdo dinâmico;
- comparar seleção, handles, guides e painel;
- revisar diferenças visuais antes de atualizar baseline.

## 6. Performance

Testar páginas com:

- 100, 500, 1.000 e 5.000 elementos;
- scroll longo;
- elementos fixed/sticky;
- transformações CSS pré-existentes.

Metas iniciais:

- seleção abaixo de 100 ms em fixture de 1.000 elementos;
- atualização de drag sem travamentos visíveis;
- coleta de guidelines abaixo de 50 ms após seleção;
- máximo de 300 elementos referência.

## 7. Segurança

- confirmar bind padrão em loopback;
- testar rejeição de `url(`, `expression(`, `javascript:` e markup;
- confirmar que `on*` attributes não são aceitos;
- confirmar que página alvo não consegue chamar endpoints remotos sem controle;
- verificar ausência de segredos com ferramenta de scanning;
- tratar texto da página como input não confiável no prompt.

## 8. Evidências do PR

PRs visuais devem incluir:

- screenshot ou pequeno vídeo antes/depois;
- página/fixture usada;
- comandos de validação;
- resultado dos casos P0 afetados;
- riscos e limitações conhecidas.

## 9. Critério de saída

Não liberar versão quando:

- CI estiver vermelho;
- houver regressão P0;
- undo causar perda de conteúdo;
- IA conseguir aplicar ação não allowlisted;
- API estiver exposta remotamente por padrão;
- houver arquivo fora do escopo ou segredo no diff.
