# Entrega por ZIP e script PowerShell

## Estrutura

```text
webdesign-ai-editor-<escopo>-patch.zip
  payload/
    <árvore relativa do repositório>
  README_APPLY.md
  MANIFEST.sha256
```

O script aplicador fica ao lado do ZIP e não deve depender de caminhos fixos do computador que gerou o pacote.

## Validações antes de escrever

O aplicador deve confirmar:

- existência e SHA-256 do ZIP;
- repositório Git e raiz correta;
- branch esperada;
- working tree limpa, salvo override explícito;
- presença de arquivos sentinela no payload;
- ausência de paths absolutos, `..` e path traversal;
- inexistência de `node_modules`, `.venv`, `.env`, segredos ou dados locais no payload.

## Aplicação

1. extrair para pasta temporária;
2. validar manifest e hashes internos;
3. enumerar todos os destinos;
4. fazer backup dos destinos existentes em `%USERPROFILE%\project-patch-backups\...`;
5. copiar apenas arquivos declarados;
6. remover temporários;
7. mostrar validações e comandos seguintes;
8. parar antes de `git add`, commit, push ou PR.

## Reversão

Para reverter, copiar a árvore do backup sobre o repositório. Arquivos criados pelo patch, que não possuíam versão anterior, devem ser removidos manualmente após revisão da lista produzida pelo aplicador.
