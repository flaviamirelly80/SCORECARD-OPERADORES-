create extension if not exists pgcrypto;

create table if not exists public.portal_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete cascade,
  usuario text not null unique,
  username text not null unique,
  nome text not null,
  perfil text not null check (perfil in ('operator', 'coordinator', 'admin')),
  funcao text,
  area text,
  turno text,
  coordinator_id uuid references public.portal_users(id) on delete set null,
  status text not null default 'Ativo' check (status in ('Ativo', 'Inativo')),
  must_change_password boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.operators (
  id uuid primary key default gen_random_uuid(),
  usuario text not null unique,
  nome text not null,
  perfil text not null,
  funcao text,
  area text,
  turno text,
  coordenador text,
  coordinator_id uuid references public.portal_users(id) on delete set null,
  status text not null default 'Ativo',
  updated_at timestamptz not null default now()
);

create table if not exists public.jornada (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  data date not null,
  status text not null check (status in ('Dia compensado','Falta Injustificada','Falta justificada','Férias','Afastado','Folga','Hora extra','Saiu mais cedo','Atraso','Banco de horas','Horário administrativo','Folga aniversariante','Aula Teórica (Jovem Aprendiz)')),
  horas text,
  observacao text,
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, import_key)
);

create table if not exists public.etiquetas (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  data date not null,
  numero_etiqueta text not null,
  categoria text not null check (categoria in ('SHE', 'MA')),
  descricao text,
  status text not null check (status in ('ABERTA','FECHADA','PENDENTE','EM_ANALISE','APROVADA','REJEITADA')),
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, import_key)
);

create table if not exists public.bos (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  data date not null,
  numero_bos text not null,
  descricao text,
  status text,
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, import_key)
);

create table if not exists public.bosq (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  data date not null,
  numero_bosq text not null,
  descricao text,
  status text,
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, import_key)
);

create table if not exists public.ideias (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  data date not null,
  titulo text not null,
  descricao text,
  status text,
  resultado text,
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, import_key)
);

create table if not exists public.metas (
  id uuid primary key default gen_random_uuid(),
  usuario text not null references public.operators(usuario) on update cascade on delete restrict,
  ano integer not null check (ano between 2000 and 2200),
  mes integer not null check (mes between 1 and 12),
  indicador text not null check (indicador in ('ETIQUETAS','BOS','BOSQ','IDEIAS','SHE_ABERTAS','SHE_FECHADAS','IDEIAS_ABERTAS')),
  meta numeric(12,2) not null check (meta >= 0),
  import_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(usuario, indicador, ano, mes),
  unique(usuario, import_key)
);

create table if not exists public.importacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_importador uuid not null references public.portal_users(id) on delete restrict,
  data_hora timestamptz not null default now(),
  nome_arquivo text not null,
  registros_encontrados integer not null default 0,
  registros_inseridos integer not null default 0,
  registros_atualizados integer not null default 0,
  erros integer not null default 0,
  duplicidades integer not null default 0,
  resultado jsonb not null default '{}'::jsonb
);

create index if not exists jornada_usuario_data_idx on public.jornada(usuario, data);
create index if not exists etiquetas_usuario_data_idx on public.etiquetas(usuario, data);
create index if not exists bos_usuario_data_idx on public.bos(usuario, data);
create index if not exists bosq_usuario_data_idx on public.bosq(usuario, data);
create index if not exists ideias_usuario_data_idx on public.ideias(usuario, data);
create index if not exists metas_usuario_periodo_idx on public.metas(usuario, ano, mes);
create index if not exists operators_area_idx on public.operators(area);
create unique index if not exists jornada_usuario_data_unique_idx on public.jornada(usuario, data);
create unique index if not exists etiquetas_usuario_numero_unique_idx on public.etiquetas(usuario, numero_etiqueta);
create unique index if not exists bos_usuario_numero_unique_idx on public.bos(usuario, numero_bos);
create unique index if not exists bosq_usuario_numero_unique_idx on public.bosq(usuario, numero_bosq);

create or replace function public.is_portal_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.portal_users p
    where p.auth_user_id = (select auth.uid())
      and p.status = 'Ativo'
      and p.perfil in ('coordinator', 'admin')
  );
$$;

create or replace function public.current_portal_user_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.id
  from public.portal_users p
  where p.auth_user_id = (select auth.uid())
    and p.status = 'Ativo'
  limit 1;
$$;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_users p
    where p.auth_user_id = (select auth.uid())
      and p.status = 'Ativo'
      and p.perfil = 'admin'
  );
$$;

create or replace function public.can_access_operator(target_usuario text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_users me
    join public.operators target on target.usuario = target_usuario
    where me.auth_user_id = (select auth.uid())
      and me.status = 'Ativo'
      and (
        me.usuario = target.usuario
        or me.perfil = 'admin'
        or (me.perfil = 'coordinator' and (
          target.coordinator_id = me.id
          or upper(trim(coalesce(target.coordenador, ''))) in
             (upper(trim(me.nome)), upper(trim(me.username)), upper(trim(me.usuario)))
        ))
      )
  );
$$;

create or replace function public.can_manage_operator(
  target_usuario text,
  target_coordinator_id uuid,
  target_coordinator text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_users me
    where me.auth_user_id = (select auth.uid())
      and me.status = 'Ativo'
      and (
        me.perfil = 'admin'
        or (
          me.perfil = 'coordinator'
          and (
            target_coordinator_id = me.id
            or upper(trim(coalesce(target_coordinator, ''))) in
               (upper(trim(me.nome)), upper(trim(me.username)), upper(trim(me.usuario)))
          )
        )
      )
  );
$$;

create or replace function public.can_manage_portal_user(target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.portal_users me
    join public.portal_users target on target.id = target_id
    where me.auth_user_id = (select auth.uid())
      and me.status = 'Ativo'
      and (
        me.perfil = 'admin'
        or (me.perfil = 'coordinator' and target.coordinator_id = me.id)
      )
  );
$$;

create or replace function public.mark_own_password_changed()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.portal_users
  set must_change_password = false, updated_at = now()
  where auth_user_id = (select auth.uid()) and status = 'Ativo';
  if not found then raise exception 'Perfil ativo não encontrado.'; end if;
end;
$$;

revoke execute on function public.is_portal_manager() from public, anon;
revoke execute on function public.current_portal_user_id() from public, anon;
revoke execute on function public.is_portal_admin() from public, anon;
revoke execute on function public.can_access_operator(text) from public, anon;
revoke execute on function public.can_manage_operator(text,uuid,text) from public, anon;
revoke execute on function public.can_manage_portal_user(uuid) from public, anon;
revoke execute on function public.mark_own_password_changed() from public, anon;

grant execute on function public.is_portal_manager() to authenticated;
grant execute on function public.current_portal_user_id() to authenticated;
grant execute on function public.is_portal_admin() to authenticated;
grant execute on function public.can_access_operator(text) to authenticated;
grant execute on function public.can_manage_operator(text,uuid,text) to authenticated;
grant execute on function public.can_manage_portal_user(uuid) to authenticated;
grant execute on function public.mark_own_password_changed() to authenticated;

alter table public.portal_users enable row level security;
alter table public.operators enable row level security;
alter table public.jornada enable row level security;
alter table public.etiquetas enable row level security;
alter table public.bos enable row level security;
alter table public.bosq enable row level security;
alter table public.ideias enable row level security;
alter table public.metas enable row level security;
alter table public.importacoes enable row level security;

drop policy if exists portal_users_read on public.portal_users;
create policy portal_users_read on public.portal_users for select to authenticated
using (
  auth_user_id = (select auth.uid())
  or public.can_manage_portal_user(id)
);
drop policy if exists portal_users_insert on public.portal_users;
create policy portal_users_insert on public.portal_users for insert to authenticated
with check (
  public.is_portal_manager()
  and auth_user_id is null
  and (
    (
      public.is_portal_admin()
      and perfil in ('operator', 'coordinator')
    )
    or (
      not public.is_portal_admin()
      and perfil = 'operator'
      and coordinator_id = (select public.current_portal_user_id())
    )
  )
);
drop policy if exists portal_users_update on public.portal_users;
create policy portal_users_update on public.portal_users for update to authenticated
using (public.can_manage_portal_user(id))
with check (public.can_manage_portal_user(id));

drop policy if exists operators_read on public.operators;
create policy operators_read on public.operators for select to authenticated
using (public.can_access_operator(usuario));
drop policy if exists operators_insert on public.operators;
create policy operators_insert on public.operators for insert to authenticated
with check (
  public.is_portal_manager()
  and public.can_manage_operator(usuario, coordinator_id, coordenador)
);
drop policy if exists operators_update on public.operators;
create policy operators_update on public.operators for update to authenticated
using (public.is_portal_manager() and public.can_access_operator(usuario))
with check (
  public.is_portal_manager()
  and public.can_manage_operator(usuario, coordinator_id, coordenador)
);

do $$
declare table_name text;
begin
  foreach table_name in array array['jornada','etiquetas','bos','bosq','ideias','metas'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_read', table_name);
    execute format('create policy %I on public.%I for select to authenticated using (public.can_access_operator(usuario))', table_name || '_read', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_insert', table_name);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.is_portal_manager() and public.can_access_operator(usuario))', table_name || '_insert', table_name);
    execute format('drop policy if exists %I on public.%I', table_name || '_update', table_name);
    execute format('create policy %I on public.%I for update to authenticated using (public.is_portal_manager() and public.can_access_operator(usuario)) with check (public.is_portal_manager() and public.can_access_operator(usuario))', table_name || '_update', table_name);
  end loop;
end;
$$;

drop policy if exists importacoes_manager_read on public.importacoes;
create policy importacoes_manager_read on public.importacoes for select to authenticated
using (
  public.is_portal_admin()
  or exists (
    select 1
    from public.portal_users p
    where p.id = importacoes.usuario_importador
      and p.auth_user_id = (select auth.uid())
      and p.perfil = 'coordinator'
      and p.status = 'Ativo'
  )
);
drop policy if exists importacoes_manager_insert on public.importacoes;
create policy importacoes_manager_insert on public.importacoes for insert to authenticated
with check (
  usuario_importador = (select id from public.portal_users where auth_user_id = (select auth.uid()))
  and public.is_portal_manager()
);

revoke all on public.portal_users, public.operators, public.jornada,
  public.etiquetas, public.bos, public.bosq, public.ideias, public.metas,
  public.importacoes
from anon, authenticated;
grant select on public.portal_users to authenticated;
grant insert (usuario,username,nome,perfil,funcao,area,turno,coordinator_id,status) on public.portal_users to authenticated;
grant update (usuario,username,nome,funcao,area,turno,status) on public.portal_users to authenticated;
grant select, insert, update on public.operators, public.jornada, public.etiquetas, public.bos, public.bosq, public.ideias, public.metas to authenticated;
grant select, insert on public.importacoes to authenticated;

create or replace function public.import_portal_data(
  p_file_name text,
  p_records jsonb,
  p_rejected integer default 0,
  p_duplicates integer default 0,
  p_errors jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  record_item jsonb;
  row_data jsonb;
  sheet_name text;
  external_user text;
  source_key text;
  record_date date;
  month_number integer;
  existed boolean;
  created_count integer := 0;
  updated_count integer := 0;
  batch_size constant integer := 500;
  batch_count integer;
  batch_number integer;
  import_phase integer;
  count_by_sheet jsonb := jsonb_build_object(
    'operators', jsonb_build_object('created',0,'updated',0),
    'attendance', jsonb_build_object('created',0,'updated',0),
    'labels', jsonb_build_object('created',0,'updated',0),
    'bos', jsonb_build_object('created',0,'updated',0),
    'bosq', jsonb_build_object('created',0,'updated',0),
    'ideas', jsonb_build_object('created',0,'updated',0),
    'goals', jsonb_build_object('created',0,'updated',0)
  );
  sheet_count_key text;
  importer_id uuid;
  started_at timestamptz := clock_timestamp();
  duration_ms integer;
begin
  if not public.is_portal_manager() then
    raise exception 'Somente coordenadores/admin podem importar dados.';
  end if;
  if jsonb_typeof(p_records) is distinct from 'array' then
    raise exception 'A lista de registros deve ser um array JSON.';
  end if;
  if jsonb_typeof(p_errors) is distinct from 'array' then
    raise exception 'A lista de erros deve ser um array JSON.';
  end if;
  batch_count := ceil(jsonb_array_length(p_records)::numeric / batch_size)::integer;
  select id into importer_id from public.portal_users where auth_user_id = (select auth.uid()) and status = 'Ativo';
  if importer_id is null then raise exception 'Perfil do importador não encontrado.'; end if;

  for import_phase in 0..1 loop
    for batch_number in 0..greatest(batch_count - 1, 0) loop
      for record_item in
        select value
        from jsonb_array_elements(p_records) with ordinality as items(value, ordinality)
        where (case when upper(value->>'sheet') = 'OPERADORES' then 0 else 1 end) = import_phase
          and ordinality between batch_number * batch_size + 1 and (batch_number + 1) * batch_size
        order by ordinality
      loop
    sheet_name := upper(record_item->>'sheet');
    row_data := record_item->'row';
    external_user := upper(trim(coalesce(row_data->>'usuario','')));
    source_key := coalesce(record_item->>'importKey','');
    if external_user = '' or source_key = '' then raise exception 'Usuario e chave de importação são obrigatórios.'; end if;

    if sheet_name = 'OPERADORES' then
      if coalesce(row_data->>'nome','') = '' then raise exception 'Nome de operador obrigatório.'; end if;
      select exists(select 1 from public.operators where usuario = external_user) into existed;
      insert into public.operators(usuario,nome,perfil,funcao,area,turno,coordenador,coordinator_id,status,updated_at)
      values (
        external_user,
        row_data->>'nome',
        case when lower(row_data->>'perfil') in ('coordenador','coordenadora','coordinator','admin') then 'coordinator' else 'operator' end,
        nullif(row_data->>'funcao',''),
        nullif(row_data->>'area',''),
        nullif(row_data->>'turno',''),
        nullif(row_data->>'coordenador',''),
        coalesce(
          (select p.id from public.portal_users p where p.perfil in ('coordinator','admin') and p.status='Ativo'
           and upper(trim(p.nome)) = upper(trim(coalesce(row_data->>'coordenador',''))) limit 1),
          importer_id
        ),
        case when lower(coalesce(row_data->>'status','ativo')) in ('inativo','inativa','inactive','0','false') then 'Inativo' else 'Ativo' end,
        now()
      )
      on conflict (usuario) do update set
        nome=excluded.nome, perfil=excluded.perfil, funcao=excluded.funcao, area=excluded.area,
        turno=excluded.turno, coordenador=excluded.coordenador, coordinator_id=excluded.coordinator_id,
        status=excluded.status, updated_at=now();
      if lower(row_data->>'perfil') not in ('coordenador','coordenadora','coordinator','admin') then
        insert into public.portal_users(usuario,username,nome,perfil,funcao,area,turno,coordinator_id,status)
        values(
          external_user,lower(external_user),row_data->>'nome','operator',
          nullif(row_data->>'funcao',''),nullif(row_data->>'area',''),nullif(row_data->>'turno',''),
          importer_id,
          case when lower(coalesce(row_data->>'status','ativo')) in ('inativo','inativa','inactive','0','false') then 'Inativo' else 'Ativo' end
        )
        on conflict(usuario) do update set
          nome=excluded.nome,funcao=excluded.funcao,area=excluded.area,turno=excluded.turno,status=excluded.status;
      end if;
      sheet_count_key := 'operators';
    else
      if not exists(select 1 from public.operators where usuario = external_user) then
        raise exception 'Usuario % não existe. Importe a aba OPERADORES antes dos registros relacionados.', external_user;
      end if;

      if sheet_name in ('JORNADA','ETIQUETAS','BOS','BOSQ','IDEIAS') then
        if coalesce(row_data->>'data','') ~ '^\d{1,2}[/.]\d{1,2}[/.]\d{4}$' then
          record_date := make_date(
            split_part(regexp_replace(row_data->>'data','/','.'),'.',3)::integer,
            split_part(regexp_replace(row_data->>'data','/','.'),'.',2)::integer,
            split_part(regexp_replace(row_data->>'data','/','.'),'.',1)::integer
          );
        else
          record_date := (row_data->>'data')::date;
        end if;
      end if;

      if sheet_name = 'METAS' then
        month_number := case lower(trim(row_data->>'mes'))
          when 'janeiro' then 1 when 'fevereiro' then 2 when 'março' then 3 when 'marco' then 3
          when 'abril' then 4 when 'maio' then 5 when 'junho' then 6 when 'julho' then 7
          when 'agosto' then 8 when 'setembro' then 9 when 'outubro' then 10 when 'novembro' then 11
          when 'dezembro' then 12 else (row_data->>'mes')::integer end;
      end if;

      case sheet_name
        when 'JORNADA' then
          select exists(select 1 from public.jornada where usuario=external_user and data=record_date) into existed;
          insert into public.jornada(usuario,data,status,horas,observacao,import_key)
          values(external_user,record_date,row_data->>'status',nullif(row_data->>'horas',''),nullif(row_data->>'observacao',''),source_key)
          on conflict(usuario,data) do update set status=excluded.status,horas=excluded.horas,observacao=excluded.observacao,import_key=excluded.import_key,updated_at=now();
          sheet_count_key := 'attendance';
        when 'ETIQUETAS' then
          select exists(select 1 from public.etiquetas where usuario=external_user and numero_etiqueta=upper(trim(coalesce(row_data->>'numeroetiqueta','')))) into existed;
          insert into public.etiquetas(usuario,data,numero_etiqueta,categoria,descricao,status,import_key)
          values(external_user,record_date,upper(trim(row_data->>'numeroetiqueta')),upper(row_data->>'categoria'),nullif(row_data->>'descricao',''),upper(row_data->>'status'),source_key)
          on conflict(usuario,numero_etiqueta) do update set data=excluded.data,categoria=excluded.categoria,descricao=excluded.descricao,status=excluded.status,import_key=excluded.import_key,updated_at=now();
          sheet_count_key := 'labels';
        when 'BOS' then
          select exists(select 1 from public.bos where usuario=external_user and numero_bos=upper(trim(coalesce(row_data->>'numerobos','')))) into existed;
          insert into public.bos(usuario,data,numero_bos,descricao,status,import_key)
          values(external_user,record_date,upper(trim(row_data->>'numerobos')),nullif(row_data->>'descricao',''),nullif(row_data->>'status',''),source_key)
          on conflict(usuario,numero_bos) do update set data=excluded.data,descricao=excluded.descricao,status=excluded.status,import_key=excluded.import_key,updated_at=now();
          sheet_count_key := 'bos';
        when 'BOSQ' then
          select exists(select 1 from public.bosq where usuario=external_user and numero_bosq=upper(trim(coalesce(row_data->>'numerobosq','')))) into existed;
          insert into public.bosq(usuario,data,numero_bosq,descricao,status,import_key)
          values(external_user,record_date,upper(trim(row_data->>'numerobosq')),nullif(row_data->>'descricao',''),nullif(row_data->>'status',''),source_key)
          on conflict(usuario,numero_bosq) do update set data=excluded.data,descricao=excluded.descricao,status=excluded.status,import_key=excluded.import_key,updated_at=now();
          sheet_count_key := 'bosq';
        when 'IDEIAS' then
          select exists(select 1 from public.ideias where usuario=external_user and import_key=source_key) into existed;
          insert into public.ideias(usuario,data,titulo,descricao,status,resultado,import_key)
          values(external_user,record_date,row_data->>'titulo',nullif(row_data->>'descricao',''),nullif(row_data->>'status',''),nullif(row_data->>'resultado',''),source_key)
          on conflict(usuario,import_key) do update set data=excluded.data,titulo=excluded.titulo,descricao=excluded.descricao,status=excluded.status,resultado=excluded.resultado,updated_at=now();
          sheet_count_key := 'ideas';
        when 'METAS' then
          select exists(select 1 from public.metas where usuario=external_user and indicador=upper(replace(trim(row_data->>'indicador'),' ','_')) and ano=(row_data->>'ano')::integer and mes=month_number) into existed;
          insert into public.metas(usuario,ano,mes,indicador,meta,import_key)
          values(external_user,(row_data->>'ano')::integer,month_number,upper(replace(trim(row_data->>'indicador'),' ','_')),(replace(row_data->>'meta',',','.'))::numeric,source_key)
          on conflict(usuario,indicador,ano,mes) do update set meta=excluded.meta,import_key=excluded.import_key,updated_at=now();
          sheet_count_key := 'goals';
        else
          raise exception 'Aba não suportada: %.', sheet_name;
      end case;
    end if;

    if existed then
      updated_count := updated_count + 1;
      count_by_sheet := jsonb_set(count_by_sheet,array[sheet_count_key,'updated'],to_jsonb((count_by_sheet->sheet_count_key->>'updated')::integer+1));
    else
      created_count := created_count + 1;
      count_by_sheet := jsonb_set(count_by_sheet,array[sheet_count_key,'created'],to_jsonb((count_by_sheet->sheet_count_key->>'created')::integer+1));
    end if;
      end loop;
    end loop;
  end loop;

  duration_ms := (extract(epoch from (clock_timestamp() - started_at)) * 1000)::integer;
  insert into public.importacoes(usuario_importador,nome_arquivo,registros_encontrados,registros_inseridos,registros_atualizados,erros,duplicidades,resultado)
  values(importer_id,left(coalesce(p_file_name,''),180),jsonb_array_length(p_records)+greatest(p_rejected,0)+greatest(p_duplicates,0),created_count,updated_count,jsonb_array_length(p_errors),greatest(p_duplicates,0),
    jsonb_build_object('summary',count_by_sheet,'errorRows',coalesce(p_errors,'[]'::jsonb),'durationMs',duration_ms));

  return jsonb_build_object(
    'success',true,'added',created_count,'updated',updated_count,
    'recordsFound',jsonb_array_length(p_records)+greatest(p_rejected,0)+greatest(p_duplicates,0),
    'rejected',greatest(p_rejected,0),'errors',jsonb_array_length(p_errors),
    'ignored',greatest(p_rejected,0),'duplicates',greatest(p_duplicates,0),
    'importedAt',to_char(now() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
    'durationMs',duration_ms,'summary',count_by_sheet,'errorRows',coalesce(p_errors,'[]'::jsonb)
  );
end;
$$;

revoke execute on function public.import_portal_data(text,jsonb,integer,integer,jsonb) from public, anon;
grant execute on function public.import_portal_data(text,jsonb,integer,integer,jsonb) to authenticated;
