# Portal de Desempenho dos Operadores

Portal para acompanhamento individual e gerencial de indicadores de operadores.

## Objetivo

- permitir que cada operador acompanhe sua performance individual;
- permitir que coordenadores visualizem o desempenho de sua equipe;
- manter o acesso restrito por perfil e por dados;
- importar dados de Excel para persistência central, acessível em todos os navegadores autorizados.

## Stack

- Portal publicado: HTML/CSS/JavaScript em `prototype-static/` (mantido sem migração visual)
- Frontend React/Vite: protótipo separado em `frontend/`
- Dados compartilhados e autenticação: Supabase via cliente JavaScript e políticas RLS
- `backend/`: implementação anterior, não utilizada pela publicação Supabase do portal

## Estrutura

- `prototype-static/supabase/` – schema PostgreSQL, políticas RLS e guia de configuração
- `backend/` – código legado de API/Prisma; não publicar para a arquitetura Supabase
- `frontend/` – aplicação React separada; o portal oficial permanece em `prototype-static/`

## Configuração do Supabase

Veja [prototype-static/supabase/SETUP.md](prototype-static/supabase/SETUP.md) para schema, configuração de Auth, provisionamento inicial e teste de RLS/multidispositivo. Configure apenas Project URL e chave anon/public no portal; nunca exponha `service_role`.

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

Integrações externas não fazem parte da persistência direta via Supabase desta configuração.

## Observações

Consulte [ARCHITECTURE.md](ARCHITECTURE.md) para a arquitetura atual. Importar planilhas não cria commits ou redeploys; o GitHub contém somente código. O portal mantém modo local apenas para desenvolvimento localhost.
