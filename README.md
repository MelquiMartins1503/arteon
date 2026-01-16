# Next.js TypeScript Starter - Arteon

Aplicação de geração de histórias interativas com IA usando **Gemini AI**.

## 🚀 Stack Tecnológica

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript 5
- **Database:** PostgreSQL com Prisma ORM
- **AI:** Google Gemini API
- **Autenticação:** JWT (jsonwebtoken)
- **Formulários:** React Hook Form + Zod
- **Styling:** TailwindCSS v4
- **Animações:** Framer Motion
- **Linting:** Biome
- **Git Hooks:** Husky + Commitlint

## 📦 Pré-requisitos

- Node.js 20+ 
- pnpm 10+
- PostgreSQL 15+

## 🛠️ Setup

### 1. Instalar dependências

```bash
pnpm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/arteon_db"
DIRECT_URL="postgresql://user:password@localhost:5432/arteon_db"

# Auth
JWT_SECRET="seu-secret-com-no-minimo-32-caracteres-aqui"

# AI
GEMINI_API_KEY="sua-chave-api-gemini"

# Environment
NODE_ENV="development"

# Optional
LOG_LEVEL="info"  # fatal | error | warn | info | debug | trace
```

### 3. Setup do banco de dados

```bash
# Gerar Prisma Client
pnpm prisma:generate

# Rodar migrations
pnpm prisma:migrate:dev
```

### 4. Iniciar servidor de desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 📜 Scripts Disponíveis

```bash
pnpm dev                 # Inicia servidor de desenvolvimento
pnpm build              # Build para produção
pnpm start              # Inicia servidor de produção
pnpm lint               # Checa linting (Biome)
pnpm format             # Formata código (Biome)

# Prisma
pnpm prisma:generate    # Gera Prisma Client
pnpm prisma:migrate:dev # Cria e aplica migrations
pnpm prisma:build       # Concatena schemas modulares
```

## 📁 Estrutura do Projeto

```
src/
├── app/                    # Next.js App Router
│   ├── (private)/         # Rotas autenticadas
│   ├── (public)/          # Rotas públicas
│   └── api/               # API routes
├── components/            # Componentes reutilizáveis
│   ├── layout/           # Layout components
│   └── ...
├── features/              # Feature modules
│   ├── chat/             # Chat functionality
│   └── story/            # Story management
├── lib/                   # Utilities & configs
│   ├── apiClient.ts      # Axios instance
│   ├── env.ts            # Environment validation
│   ├── logger.ts         # Pino logger
│   └── ...
├── hooks/                 # Custom React hooks
└── providers/             # Context providers

prisma/
├── schema.prisma          # Main Prisma schema
└── models/                # Modular models
    ├── Chat.prisma
    ├── Story.prisma
    └── User.prisma
```

## 🏗️ Arquitetura

### Prisma Modular Schema
O schema do Prisma é dividido em arquivos modulares dentro de `prisma/models/`. O script `prisma:build` concatena todos eles antes de gerar o cliente.

### Feature-based Organization
Funcionalidades são organizadas em módulos independentes dentro de `/features`.

### API Routes
Rotas de API seguem o padrão do Next.js 16 App Router em `src/app/api/`.

## 🔐 Autenticação

- Baseada em JWT armazenado em cookies HTTP-only
- Middleware de autenticação: `/lib/getAuthenticatedUser.ts`
- Protected routes: `(private)` route group

## 📝 Convenções de Código

### Commits
Utilizamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
feat: adiciona nova funcionalidade
fix: corrige bug
docs: atualiza documentação
```

### Nomenclatura
- **Componentes:** PascalCase
- **Hooks:** camelCase com `use` prefix
- **Utils:** camelCase
- **Constants:** UPPER_SNAKE_CASE

## 📊 Logging

O projeto utiliza [Pino](https://github.com/pinojs/pino) para logging estruturado:

```typescript
import logger from '@/lib/logger';

logger.info({ userId: 1 }, 'User logged in');
logger.error({ error }, 'Failed to save story');
```

## 🤝 Contribuindo

1. Crie uma branch: `git checkout -b feat/nova-feature`
2. Commit suas mudanças: `git commit -m 'feat: adiciona nova feature'`
3. Push para a branch: `git push origin feat/nova-feature`
4. Abra um Pull Request

## 📦 Deploy

### Vercel (Recomendado)

```bash
pnpm build
# Conecte ao Vercel via dashboard
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm i -g pnpm && pnpm install
COPY . .
RUN pnpm build
CMD ["pnpm", "start"]
```

### Variáveis de Ambiente (Produção)
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: Min 32 caracteres
- `GEMINI_API_KEY`: Google Gemini API
- `NODE_ENV=production`

---

## 🔄 CI/CD

GitHub Actions configurado:
- ✅ Tests em cada PR
- ✅ Lint automático
- ✅ Build verification

---

## 🤝 Contribuindo

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para detalhes.

## 📄 Licença

Privado - Todos os direitos reservados
