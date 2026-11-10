# Arquitetura do Portal

## Aplicação e dados

- O portal atual é o HTML/CSS/JavaScript em `prototype-static/`; `frontend/` é um protótipo separado e não é usado na publicação.
- A aplicação consulta diretamente o Supabase usando a biblioteca JavaScript oficial e somente URL/chave anon pública.
- Jornada, Etiquetas, BOS, BOSQ, Ideias, Metas, operadores e histórico de importações ficam no banco Supabase, nunca no GitHub ou no `localStorage`.
- O `localStorage` do navegador guarda somente a sessão de autenticação/cache permitido. No localhost, o modo local de demonstração continua disponível.
- `backend/` e Prisma permanecem no repositório, mas não fazem parte do fluxo de publicação ou persistência Supabase descrito aqui.

## Modelo de dados e segurança

O schema SQL em `prototype-static/supabase/schema.sql` cria `portal_users`, `operators`, `jornada`, `etiquetas`, `bos`, `bosq`, `ideias`, `metas` e `importacoes`. `usuario` é texto em todas as tabelas. As tabelas transacionais preservam períodos históricos e usam chaves únicas compostas para upsert.

RLS restringe linhas individuais ao próprio `usuario`; coordenadores veem a equipe associada ao perfil e administradores têm escopo global. A função `import_portal_data` no PostgreSQL do Supabase processa OPERADORES antes dos outros registros e grava a importação e o log atomicamente. Não é uma API nem um backend hospedado à parte.

## Configuração e publicação

Siga [prototype-static/supabase/SETUP.md](./prototype-static/supabase/SETUP.md) para criar o projeto, executar o schema, provisionar Auth e configurar `PORTAL_SUPABASE_URL` e `PORTAL_SUPABASE_ANON_KEY` no HTML do portal. Nunca inclua a chave `service_role`.

No Vercel, publique somente `prototype-static/`, com preset **Other** e sem build/output directory. Não publique `backend/` para essa arquitetura.

## Validação operacional

Antes de liberar o portal, testar importação repetida, preservação de meses históricos, leitura em navegador separado e isolamento RLS entre usuários. O teste entre dispositivos requer um projeto Supabase configurado; sem ele, o fluxo central não pode ser verificado de ponta a ponta.
