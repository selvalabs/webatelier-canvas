# ADR 0003 - Patch como linguagem comum

## Status

Aceito.

## Contexto

Edição manual, IA, undo/redo, persistência e exportação precisam compartilhar uma representação.

## Decisão

Toda alteração gera um patch atômico com seletor, ação, propriedade opcional, before, after, origem e metadados de sessão.

## Consequências

- histórico uniforme;
- exportadores podem consumir patches sem conhecer a UI;
- seletores precisam de diagnóstico e estratégia de estabilidade;
- operações compostas podem gerar múltiplos patches correlacionados.
