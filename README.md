# Arteon - Next.js AI Story Platform

Aplicativo privado para geração de histórias interativas e imersivas utilizando **Google Gemini AI**. O projeto foca em uma experiência fluida com design premium, suporte a conteúdo multimídia (imagens/áudio) e uma arquitetura robusta.

## 🚀 Tecnologias Principais

- **Core:** Next.js 16 (App Router), React 19, TypeScript 5.
- **Estilo:** Tailwind CSS v4, Framer Motion (animações).
- **Dados:** PostgreSQL, Prisma ORM (Schema Modular).
- **AI:** Google Gemini API.
- **Infra:** Vercel, AWS S3/R2 (Storage).
- **Qualidade:** Biome (Lint/Format), Husky (Git Hooks).

---

## 🏗️ Arquitetura do Sistema

### 1. Hybrid Proxy & Segurança
Implementamos uma camada de segurança personalizada (`src/proxy.ts`) que atua como middleware híbrido:
- **Autenticação JWT:** Validação stateless de tokens com rotação automática.
- **Rate Limiting:** Proteção contra abuso (100 req/min padrão).
  - Headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`.
  - Resposta 429: Bloqueio temporário com `Retry-After`.
- **Logging Estruturado:** Sistema baseado em `Pino` para rastreabilidade completa de requisições e erros.

### 2. Estrutura de Diretórios
```
src/
├── app/                  # Next.js App Router (Public & Private Routes)
├── features/             # Módulos de funcionalidade (Chat, Story, etc.)
├── components/           # UI Kit reutilizável (Design System)
├── lib/                  # Utilitários (Logger, API Client, Env)
├── services/             # Lógica de negócio (Gemini, Knowledge Base)
└── proxy.ts              # Middleware de segurança global
```

### 3. Banco de Dados Modular
O schema do Prisma é dividido em múltiplos arquivos para melhor organização:
- `prisma/models/*.prisma`: Definisões de modelos individuais.
- **Comando:** `pnpm prisma:build` concatena tudo em `schema.prisma`.

---

## 🛠️ Configuração e Instalação

### Pré-requisitos
- Node.js 20+
- pnpm 10+
- PostgreSQL ativo

### Variáveis de Ambiente (.env)
```env
# Database
DATABASE_URL="postgresql://..."

# Auth
JWT_SECRET="seu-segredo-super-seguro"

# AI Services
GEMINI_API_KEY="sua-chave-api"

# Storage (R2/S3)
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="..."
R2_PUBLIC_URL="..."

# App
NODE_ENV="development"
LOG_LEVEL="info"
```

### Comandos Úteis
```bash
# Instalação
pnpm install

# Desenvolvimento
pnpm dev

# Banco de Dados
pnpm prisma:generate    # Gerar tipagem
pnpm prisma:migrate:dev # Criar migration
pnpm prisma:build       # Reconstruir schema modular

# Qualidade
pnpm lint   # Rodar Biome Lint
pnpm format # Formatar código
```

---

## 🛡️ Política de Contribuição (Privado)

Este é um projeto **PRIVADO**.
- Não faça commit de chaves de API ou segredos.
- Siga o padrão de **Conventional Commits** (`feat:`, `fix:`, `docs:`).
- Mantenha a consistência visual utilizando os componentes de `src/components`.
- Respeite as regras de lint do **Biome**.

---

© 2024-2026 Arteon Project. Todos os direitos reservados.
