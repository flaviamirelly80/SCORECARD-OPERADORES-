# Configuração do Supabase

O portal publicado consulta o Supabase diretamente. Não configure ou publique `backend/` para este fluxo.

## 1. Criar as tabelas e políticas

No Supabase, abra **SQL Editor**, cole e execute `schema.sql`. O script cria as tabelas e índices, ativa RLS, cria as políticas de acesso e a função transacional `import_portal_data`. A função processa os registros internamente em lotes de 500, dentro de uma única chamada e transação PostgreSQL; registra um histórico por arquivo, independentemente do número de lotes. Não há limite fixo de 5.000 registros no portal. Não é uma API ou um backend próprio.

## 2. Configurar o portal

No painel Supabase, copie **Project URL** e a chave **anon/public** (nunca `service_role`). Configure os valores públicos antes de `js/config.js` em `prototype-static/index.html`:

```html
<script>
  window.PORTAL_SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
  window.PORTAL_SUPABASE_ANON_KEY = 'SUA_CHAVE_ANON_PUBLICA';
</script>
```

São valores públicos; a segurança depende das políticas RLS. Não publique a chave `service_role` nem senhas de banco no portal.

### Autenticação por Usuario e Senha

Na interface, a pessoa informa somente `Usuario` e `Senha`. O portal gera internamente o identificador técnico `<usuario-normalizado>@portal-desempenho.invalid` para o Supabase Auth; esse e-mail não é mostrado nem solicitado ao usuário.

Em **Authentication → Sign In / Providers → Email**:

1. Mantenha Email habilitado para `signInWithPassword`.
2. Desative **Confirm email**. O identificador `.invalid` não pode receber mensagens, então confirmação por e-mail não é utilizável.
3. Desative **Allow new users to sign up** para bloquear cadastro público. Crie contas manualmente pela área administrativa do Supabase Auth; o portal não chama `signUp`.
4. Não configure recuperação de senha por e-mail para essas contas. O botão de recuperação no portal orienta a pessoa a procurar a equipe administradora; redefina senhas administrativamente no Supabase Auth.

Ao provisionar uma conta, use o e-mail técnico correspondente ao Usuario normalizado. Não é necessário enviar confirmação ou mensagem ao usuário. A conta deve ser vinculada ao perfil do portal como descrito abaixo. `Usuario` continua sendo o identificador oficial do colaborador e as consultas/regras de acesso não usam o e-mail técnico.

O navegador usa apenas a chave pública anon e nunca contém `service_role`.

## 3. Cadastrar a primeira administradora

1. Em **Authentication → Users**, crie manualmente a conta com e-mail `<usuario-normalizado>@portal-desempenho.invalid` e senha inicial. Com **Confirm email** desativado, não é preciso enviar nem confirmar mensagem.
2. No SQL Editor, vincule a conta Auth ao perfil administrativo (substitua os três valores):

```sql
insert into public.portal_users
  (auth_user_id, usuario, username, nome, perfil, status, must_change_password)
select id, 'USUARIO_EXTERNO', 'usuario.normalizado', 'Nome da Administradora', 'admin', 'Ativo', true
from auth.users
where email = 'usuario.normalizado@portal-desempenho.invalid';
```

O perfil `admin` é deliberadamente bloqueado para criação/alteração pelo cliente. A importação da aba OPERADORES cria/atualiza um perfil sem credencial para cada operador; quando autorizado, crie manualmente a conta de autenticação no Supabase Auth com o endereço sintético baseado no `Usuario` e vincule-a ao perfil:

```sql
update public.portal_users
set auth_user_id = (select id from auth.users where email = 'operador.normalizado@portal-desempenho.invalid')
where username = 'operador.normalizado';
```

Apenas a equipe de administração deve executar esse vínculo. O navegador nunca recebe permissão para associar contas Auth a perfis. Coordenadores adicionais também precisam ser provisionados no Supabase Auth e vinculados por SQL pelo administrador.

## 4. Importação e histórico

O portal valida as abas antes do envio. A função `import_portal_data` no banco processa `OPERADORES` primeiro e aplica upsert por identificadores estáveis (por exemplo, Usuario+Data para Jornada, Usuario+NumeroEtiqueta para Etiquetas, e Usuario+Número para BOS/BOSQ). Metas usam Usuario+indicador+ano+mês. Importar ou reimportar um mês não exclui outros períodos. A chamada grava um único histórico por arquivo. Os dados operacionais são consultados pelas políticas RLS; cada operador só lê o próprio usuário e coordenadores leem os operadores associados à sua equipe.

## 5. Verificação

1. Entre como administradora/coordenadora e importe uma planilha de teste.
2. Repita o arquivo e verifique que as chaves existentes são atualizadas.
3. Importe períodos distintos e confirme que todos continuam nas tabelas.
4. Em outro perfil de navegador, entre com um operador associado e confira os dados dele.
5. Teste que esse operador não consegue consultar registros de outro usuário.
6. Importe meses sequenciais e reimporte um mês intermediário; confirme que os demais meses continuam disponíveis e que a reimportação atualiza os registros correspondentes sem duplicá-los.

O teste multi-dispositivo requer um projeto Supabase configurado e contas separadas. Não foi possível executá-lo apenas com o repositório.

## Limitações conhecidas

- Criar o perfil no portal não cria uma conta Supabase Auth; essa etapa exige a equipe de administração e a vinculação indicada acima.
- Redefinições de senha são administrativas no Supabase Auth; recuperação por e-mail técnico não está disponível, e a chave privilegiada nunca é enviada ao navegador.
- A chave anon/public pode ser pública somente depois de aplicar o schema e validar todas as políticas RLS.
