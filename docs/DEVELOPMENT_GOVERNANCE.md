# Governança de desenvolvimento assistido

## 1. Objetivo

Esta diretriz adapta ao WebDesign AI Editor o processo de desenvolvimento assistido por IA com controle humano. Ela acrescenta regras específicas do produto sem substituir PRD, arquitetura, specs, sprints, QA ou as políticas gerais de contribuição.

## 2. Fluxo operacional

```text
Issue -> Branch -> Implementação local -> Validação local -> Revisão do diff -> Commit -> Push -> PR -> CI -> Revisão -> Merge -> Sync local
```

A IA pode estruturar issues, produzir patches, revisar diffs, interpretar falhas e preparar comandos. O desenvolvedor decide o escopo, executa no ambiente real, valida, commita, publica, revisa e autoriza o merge.

## 3. Regras específicas deste projeto

### 3.1 Local-first é uma restrição arquitetural

Toda feature do MVP deve funcionar com browser, armazenamento e modelo na máquina local. Um adaptador HTTP pode reutilizar os serviços, mas não pode se tornar dependência do fluxo local.

### 3.2 O runtime visual é código privilegiado

O runtime é injetado em páginas potencialmente não confiáveis. Portanto:

- usa namespace e Shadow DOM para reduzir colisões;
- não interpreta instruções contidas na página;
- não executa strings como código;
- limita contexto enviado ao modelo;
- trata seletores, textos, atributos e estilos como dados;
- mantém ações de IA em allowlist explícita.

### 3.3 O contrato de patch é compatibilidade pública interna

Alterações em ações, propriedades, serialização ou semântica de undo/redo precisam de:

- issue dedicada;
- atualização de `docs/SPECS.md` e ADR quando necessário;
- migração ou estratégia de compatibilidade;
- testes de round-trip e de rejeição;
- versionamento do schema antes de persistência remota.

### 3.4 Fonte e artefato gerado não podem divergir

`editor-runtime/src/` é a fonte de verdade. O bundle em `src/webdesign_ai_editor/static/` deve ser produzido por `npm run --prefix editor-runtime build`. PRs que alteram o runtime devem incluir ambos e o CI deve confirmar que um novo build não gera diff.

### 3.5 Mudança visual precisa de evidência visual

Além de lint, testes e typecheck, PRs de seleção, handles, snapping, painel ou transformação devem informar:

- URL/fixture usada;
- viewport e navegador;
- passos manuais;
- resultado esperado e observado;
- screenshot ou vídeo quando disponível;
- limitações conhecidas de layout responsivo.

### 3.6 IA nunca aplica capacidade nova implicitamente

Um prompt só pode produzir ações já definidas e validadas. Adicionar uma nova propriedade, atributo ou tipo de ação exige mudança de código revisada; o modelo não pode ampliar permissões por conta própria.

### 3.7 Webservice depende de gate explícito

Nenhuma exposição pública é aceita apenas trocando o host de bind. Antes de um modo remoto, devem existir autenticação, autorização, isolamento de sessões e browsers, controle de egress/SSRF, limites de recursos, TLS, auditoria, retenção e resposta a abuso. O gate está detalhado em `docs/LOCAL_FIRST_AND_WEBSERVICE.md` e `docs/THREAT_MODEL.md`.

## 4. Matriz de validação

| Mudança | Validação obrigatória adicional |
|---|---|
| Domínio/schema | testes válidos e inválidos; compatibilidade |
| Ollama/prompt | mock de resposta; timeout; JSON inválido; conteúdo hostil |
| Persistência | round-trip; arquivo corrompido; paths fora do projeto |
| Runtime visual | typecheck, build e QA headed |
| Smart guides | centros, bordas, gaps, scroll e performance |
| API | teste de contrato e confirmação de bind local |
| Webservice | threat model e aprovação do gate de segurança |
| Dependência | justificativa, licença e atualização de notices |

## 5. Critérios de bloqueio de merge

O merge fica bloqueado quando houver CI vermelho, segredo, arquivo fora do escopo, bundle gerado divergente, teste local pendente, evidência visual ausente em mudança visual, ampliação de allowlist sem teste, exposição remota não protegida ou PR sem issue.

## 6. Patches e ZIPs

Entregas multi-arquivo devem seguir `docs/PATCH_DELIVERY.md`. O aplicador deve falhar cedo, validar branch e raiz, bloquear path traversal, fazer backup fora do repositório e nunca commitar automaticamente.

## 7. Bootstrap do repositório

A criação inicial é uma exceção controlada: o repositório remoto recebe apenas um README inicial; a fundação completa entra por branch e PR. O script de bootstrap para depois da aplicação e deixa validação, commit, push, PR e merge sob controle humano.
