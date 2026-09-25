# Portal de Desempenho dos Operadores

Portal corporativo para acompanhamento individual e gerencial de indicadores de operadores da JDE Peet's.

## Objetivo

- permitir que cada operador acompanhe sua performance individual;
- permitir que coordenadores visualizem o desempenho de sua equipe;
- manter o acesso restrito por perfil e por dados;
- preparar a arquitetura para importação Excel e integração futura com Power Automate.

## Stack

- Frontend: React + TypeScript + Vite + Tailwind CSS + Recharts
- Backend: Node.js + Express + TypeScript
- Banco: PostgreSQL via Prisma ORM, com DDL explícito em `database/schema.sql`
- Segurança: JWT + RBAC + validação de acesso no backend

## Estrutura

- `backend/` – API, Prisma e regras de negócio
- `frontend/` – aplicação React
- `.env.example` – variáveis sensíveis de exemplo

## Instalação

1. Instale o Node.js LTS.
2. No diretório raiz, execute:
   npm install
3. Configure as variáveis de ambiente copiando `.env.example` para `.env`.
4. Crie o banco e gere o cliente Prisma:
   npm run prisma:generate --workspace backend
   npm run prisma:migrate --workspace backend
5. Execute o seed de demonstração:
   npm run prisma:seed --workspace backend

## Iniciar o sistema

- Backend:
  npm run dev --workspace backend
- Frontend:
  npm run dev --workspace frontend
- Ou em modo combinado:
  npm run dev

## Login de demonstração

- Coordenadora: `michellefaria` / valor de `DEFAULT_TEMP_PASSWORD`
- Operadores: username definido no seed / valor de `DEFAULT_TEMP_PASSWORD`

No primeiro login, a API exige `POST /api/auth/change-password` e não libera o dashboard enquanto `must_change_password` estiver ativo.

## Funcionalidades do MVP

- autenticação com JWT e RBAC;
- dashboard individual;
- dashboard do coordenador;
- jornada e faltas;
- etiquetas, BOS, BOSQ e ideias;
- evolução mensal;
- importação e exportação Excel;
- dados demonstrativos.

## Arquitetura para Power Automate

A API prepara endpoints de integração sob `/api/integrations/*` e autenticação por API Key em ambiente corporativo.

## Observações

Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para tabelas, permissões, reset de senha, alternância local/API, rede corporativa e integração futura. O seed usa os 18 operadores já presentes no protótipo e não deve ser executado sobre um banco de produção sem revisão.
