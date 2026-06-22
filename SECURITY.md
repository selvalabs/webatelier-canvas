# Política de segurança

Não publique vulnerabilidades em issues abertas.

Para o MVP local:

- mantenha a API em `127.0.0.1`;
- não exponha a porta do Ollama à internet;
- não abra projetos web não confiáveis com credenciais sensíveis no mesmo perfil do navegador;
- use um contexto Playwright isolado;
- revise patches gerados por IA antes de exportá-los ao código-fonte;
- nunca inclua segredos no prompt ou nos arquivos de patches.

A evolução para webservice exige autenticação, autorização por projeto, TLS, limites de uso, isolamento de workers, armazenamento seguro e auditoria. Consulte `docs/THREAT_MODEL.md`.
