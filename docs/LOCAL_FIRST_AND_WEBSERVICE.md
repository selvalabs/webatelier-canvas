# Local-first e evolução para webservice

## 1. Decisão

O produto será entregue primeiro como aplicação local. Entretanto, contratos, serviços e runtime serão projetados para evitar acoplamento exclusivo ao processo local.

## 2. Local-first obrigatório

No modo padrão:

- Playwright roda na máquina do usuário;
- Chromium abre headed;
- Ollama roda em loopback;
- prompts não saem da máquina;
- patches ficam no diretório local da aplicação;
- comunicação browser/Python usa binding interno;
- API HTTP é opcional.

## 3. Interfaces preservadas

### AIProvider

Entrada: contexto estruturado + prompt.  
Saída: `EditPlan` validado.

Implementações futuras:

- Ollama local;
- Ollama remoto privado;
- provider cloud autorizado pelo usuário.

### PatchRepository

Operações:

- append;
- listar por sessão;
- exportar.

Implementações futuras:

- JSONL;
- SQLite;
- PostgreSQL/event store.

### BrowserBridge

Responsabilidades:

- receber eventos do runtime;
- responder pedidos de IA;
- enviar comandos e estado.

Implementações:

- Playwright binding local;
- WebSocket autenticado;
- extensão de navegador.

## 4. Fases de evolução

### Fase A - local individual

- contexto efêmero;
- JSONL;
- um browser por processo;
- Ollama local.

### Fase B - daemon local

- API e WebSocket em loopback;
- múltiplas sessões locais;
- SQLite;
- launcher separado da UI.

### Fase C - serviço privado

- autenticação;
- projetos e permissões;
- PostgreSQL;
- fila;
- workers Playwright isolados;
- armazenamento de artefatos;
- TLS.

### Fase D - colaboração

- presença;
- locks ou CRDT;
- comentários;
- revisão e aprovação;
- políticas de retenção e auditoria.

## 5. Gates para host remoto

Antes de permitir `0.0.0.0` ou deploy público, devem existir:

- autenticação obrigatória;
- autorização por projeto/sessão;
- TLS;
- proteção CSRF/CORS adequada;
- rate limiting;
- limites de payload e timeout;
- isolamento de browser por tenant;
- bloqueio de navegação a redes internas sensíveis;
- gestão de segredos;
- logs de auditoria;
- política de dados;
- testes de segurança.

O MVP inclui apenas a separação arquitetural; não inclui esses controles completos.
