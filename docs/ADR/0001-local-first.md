# ADR 0001 - Local-first com evolução planejada para serviço

## Status

Aceito.

## Contexto

O produto deve usar Playwright headed e Ollama já instalado no computador do usuário. Ao mesmo tempo, há intenção de disponibilizar uma versão de serviço no futuro.

## Decisão

O primeiro deployment é local, sem porta HTTP obrigatória. Domínio e serviços serão separados de Playwright, JSONL e Ollama por contratos explícitos. Uma API FastAPI reutiliza os mesmos serviços, mas permanece em loopback por padrão.

## Consequências

Positivas:

- privacidade e baixa dependência externa;
- feedback rápido;
- arquitetura reutilizável;
- menor superfície de ataque inicial.

Negativas:

- setup local possui dependências de browser e modelo;
- webservice ainda exigirá infraestrutura e controles importantes;
- algumas decisões de UX local não escalam diretamente para colaboração.
