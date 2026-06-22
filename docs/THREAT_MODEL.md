# Threat model

## 1. Ativos

- código do projeto alvo;
- conteúdo visual e textual da página;
- prompts;
- patches e histórico;
- acesso ao Ollama;
- sessão do browser;
- credenciais eventualmente presentes na aplicação alvo.

## 2. Atores e fontes de risco

- página alvo maliciosa;
- dependência comprometida;
- modelo produzindo ação inesperada;
- serviço local exposto por configuração incorreta;
- usuário remoto não autorizado em futura versão webservice;
- exportador de código escrevendo fora do projeto.

## 3. Ameaças MVP

### T-01 Prompt injection pelo conteúdo da página

Mitigação:

- conteúdo é delimitado como dados;
- system prompt proíbe seguir instruções do DOM;
- saída passa por schema e allowlist;
- modelo não recebe capacidade de executar ferramentas.

### T-02 CSS ativo ou exfiltração

Mitigação:

- rejeitar `url(`, `@import`, `expression(`, `javascript:` e markup;
- não permitir propriedades de imagem por IA no MVP;
- ações manuais continuam sob responsabilidade do usuário.

### T-03 XSS por HTML gerado

Mitigação:

- `set_text` usa `textContent`;
- não existe ação `set_html`;
- atributos `on*` são proibidos.

### T-04 Ollama exposto

Mitigação:

- URL padrão loopback;
- documentação explícita;
- doctor avisa sobre host não-loopback quando detectável.

### T-05 SSRF no webservice futuro

Mitigação futura obrigatória:

- allowlist de destinos;
- bloqueio de IPs privados e metadata services;
- proxy controlado;
- egress policy nos browser workers.

### T-06 Escape de diretório em patches/exportadores

Mitigação:

- paths resolvidos contra raiz autorizada;
- rejeição de traversal;
- backup externo;
- preview de diff;
- exportadores não existem no MVP.

## 4. Restrições para webservice

A flag de host remoto é apenas para desenvolvimento em rede confiável. Deploy público está proibido até conclusão dos gates de `docs/LOCAL_FIRST_AND_WEBSERVICE.md`.
