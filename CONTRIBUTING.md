# Contributing

## Desenvolvimento

1. Clone o repositório
2. Instale dependências: `pnpm install`
3. Configure `.env` com variáveis necessárias
4. Rode os testes: `pnpm test`
5. Inicie dev server: `pnpm dev`

## Commits

Usamos conventional commits:
- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `test:` Testes
- `refactor:` Refatoração

## Pull Requests

1. Crie branch: `git checkout -b feat/my-feature`
2. Faça commits atômicos
3. Escreva testes
4. Rode `pnpm lint` e `pnpm test`
5. Abra PR para `develop`

## CI/CD

- CI roda automaticamente em PRs
- Todos os testes devem passar
- Coverage mínimo: 70%
