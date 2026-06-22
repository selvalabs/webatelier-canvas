# ADR 0002 - Playwright binding como bridge local

## Status

Aceito.

## Contexto

O runtime injetado precisa enviar patches ao Python e solicitar planos de IA. `fetch` para uma API local cria problemas de CORS, mixed content e porta adicional.

## Decisão

Usar funções expostas por `page.expose_binding` no modo local. O runtime é instalado com `page.add_init_script` para sobreviver a navegações.

## Consequências

- comunicação direta e assíncrona;
- nenhuma porta necessária no fluxo principal;
- bridge deve ser abstrata para futura substituição por WebSocket;
- chamadas precisam validar payload porque a página é não confiável.
