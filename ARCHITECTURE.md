# Arquitetura do Portal

## Estado desta etapa

O frontend existente foi preservado. `prototype-static/js/config.js` mantém `dataSource: 'local'`, e o adaptador `PORTAL_API` permite migrar serviço por serviço para a API sem apagar localStorage. A API não é publicada e a restrição de rede permanece desativada.

## Banco e execução

O banco preparado é PostgreSQL, com UUIDs e nomes de tabelas independentes de provedor. O modelo Prisma está em `backend/prisma/schema.prisma`; o DDL explícito está em `database/schema.sql`. A conexão vem de `DATABASE_URL`. SQL Server continua possível por migração/adaptação do DDL, sem IP, cloud ou credencial fixos no código.

```text
DATABASE_URL=postgresql://usuario:senha@servidor:5432/portal_desempenho
npm install
npm run prisma:generate --workspace backend
npm run prisma:migrate --workspace backend
npm run prisma:seed --workspace backend
npm run dev --workspace backend
```

O seed cria Michelle Faria como `coordinator`, sem coordenador, e os 18 operadores do protótipo, distribuídos em CAFÉ CRU (8), MOAGEM (3) e TORRADOR (7). Não cria matrícula ou e-mail.

## Segurança e autenticação

`DEFAULT_TEMP_PASSWORD` fica no ambiente; seu valor padrão lógico é `JDE@1234`, mas apenas o hash bcrypt é persistido. Login normaliza `username` com trim e lowercase, verifica `active`, compara bcrypt, atualiza `last_login` e devolve JWT sem senha. Usuários novos e resets ficam com `must_change_password = true`; a API bloqueia a troca para a nova senha até cumprir mínimo de 8 caracteres e confirmação.

Rotas protegidas verificam o JWT no backend. Operadores consultam somente o próprio `user_id`; coordenadores só consultam usuários cujo `coordinator_id` é o seu próprio ID. Michelle nunca entra na lista da equipe. Desativação usa `active = false` e preserva histórico.

## Endpoints

- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `GET/POST /api/users`, `GET/PUT /api/users/:id`, `POST /api/users/:id/reset-password`
- `GET/POST /api/attendance`, `/api/labels`, `/api/bos`, `/api/bosq`, `/api/improvement-ideas`, `/api/goals`
- `GET /api/me/dashboard` e `GET /api/team/dashboard`
- `POST /api/integrations/attendance`, `labels`, `bos`, `bosq`, `improvement-ideas`, `goals` (requer `X-API-Key` configurada)

BOS e BOSQ são tabelas e rotas separadas. Importação Excel deve resolver a coluna `Usuario` contra `users.username` e persistir somente `users.id`; `import_logs` registra o resultado.

## Configuração e produção

As variáveis estão em `.env.example`. `DATA_SOURCE=local` é o padrão de desenvolvimento; altere para `api` somente quando o adaptador do frontend estiver pronto. `NETWORK_RESTRICTION_ENABLED=false` permanece desligado. O middleware separado `networkAccessMiddleware` pode ser ativado por ambiente, mas nenhuma faixa de IP fictícia foi criada: `ALLOWED_NETWORKS` fica vazio.

Antes da publicação, a TI precisa definir hospedagem, PostgreSQL ou SQL Server, firewall/reverse proxy, VPN, Entra ID, MFA, redes autorizadas e política de segredos. A futura integração Power Automate deve usar os endpoints de integração com API key/credencial gerenciada, nunca acesso direto ao banco.