-- Gestão OP — fundação segura e escalável do core de parceria
-- Migration aditiva: não remove tabelas nem registros existentes.

begin;

-- ---------------------------------------------------------------------------
-- Acessos e auditoria
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists ativo boolean not null default true;

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  criado_em timestamptz not null default now(),
  usuario_id uuid references public.profiles(id) on delete set null,
  unidade_id uuid references public.unidades(id) on delete set null,
  entidade text not null,
  entidade_id uuid,
  acao text not null,
  dados_anteriores jsonb,
  dados_novos jsonb
);

alter table public.audit_logs enable row level security;

drop policy if exists "admin read audit logs" on public.audit_logs;
create policy "admin read audit logs"
  on public.audit_logs for select
  using (public.current_user_role() = 'admin');

-- Usuários criados pela API pública nunca recebem privilégios a partir de
-- user_metadata. Apenas app_metadata, gravado pela Admin API, é confiável.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_role text;
  v_unidade_id uuid;
  v_provisionado boolean;
begin
  v_provisionado := coalesce(new.raw_app_meta_data->>'provisioned_by_admin', 'false') = 'true';
  v_role := case
    when v_provisionado and new.raw_app_meta_data->>'role' in ('admin', 'pdv')
      then new.raw_app_meta_data->>'role'
    else 'pdv'
  end;
  v_unidade_id := case
    when v_provisionado and v_role = 'pdv' and new.raw_app_meta_data ? 'unidade_id'
      then (new.raw_app_meta_data->>'unidade_id')::uuid
    else null
  end;

  insert into public.profiles (id, nome, role, unidade_id, username, ativo)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'nome'), ''), new.email),
    v_role,
    v_unidade_id,
    nullif(lower(trim(new.raw_user_meta_data->>'username')), ''),
    v_provisionado
  );

  return new;
end;
$$;

-- Inativos deixam de satisfazer todas as policies que dependem destes helpers.
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid() and ativo = true;
$$;

create or replace function public.current_user_unidade_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select unidade_id from public.profiles where id = auth.uid() and ativo = true;
$$;

-- ---------------------------------------------------------------------------
-- Estoque: mantém as assinaturas atuais das RPCs para não quebrar o frontend,
-- mas ignora realizado_por informado pelo cliente e usa sempre auth.uid().
-- ---------------------------------------------------------------------------

create or replace function public.registrar_entrada_pingentes(
  p_unidade_id uuid,
  p_quantidade int,
  p_realizado_por uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_unidade_id uuid;
begin
  select role, unidade_id into v_role, v_unidade_id
  from public.profiles
  where id = auth.uid() and ativo = true;

  if v_role is null then
    raise exception 'Acesso não autorizado.';
  end if;
  if p_quantidade is null or p_quantidade < 1 or p_quantidade > 100000 then
    raise exception 'Quantidade deve estar entre 1 e 100000.';
  end if;
  if v_role = 'pdv' and p_unidade_id is distinct from v_unidade_id then
    raise exception 'A unidade informada não pertence a este acesso.';
  end if;
  if v_role not in ('admin', 'pdv') then
    raise exception 'Perfil sem permissão para registrar entrada.';
  end if;

  update public.unidades
  set saldo_pingentes = saldo_pingentes + p_quantidade
  where id = p_unidade_id;

  if not found then
    raise exception 'Unidade não encontrada.';
  end if;

  insert into public.movimentacoes_pingentes
    (unidade_id, tipo, quantidade, realizado_por)
  values
    (p_unidade_id, 'entrada', p_quantidade, auth.uid());
end;
$$;

create or replace function public.ajuste_manual_pingentes(
  p_unidade_id uuid,
  p_novo_saldo int,
  p_observacao text,
  p_realizado_por uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_saldo_atual int;
  v_diferenca int;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Apenas o administrador pode ajustar o saldo.';
  end if;
  if p_novo_saldo is null or p_novo_saldo < 0 then
    raise exception 'O novo saldo não pode ser negativo.';
  end if;
  if nullif(trim(p_observacao), '') is null then
    raise exception 'A observação é obrigatória.';
  end if;

  select saldo_pingentes into v_saldo_atual
  from public.unidades
  where id = p_unidade_id
  for update;

  if not found then
    raise exception 'Unidade não encontrada.';
  end if;

  v_diferenca := p_novo_saldo - v_saldo_atual;

  update public.unidades
  set saldo_pingentes = p_novo_saldo
  where id = p_unidade_id;

  insert into public.movimentacoes_pingentes
    (unidade_id, tipo, quantidade, observacao, realizado_por)
  values
    (p_unidade_id, 'ajuste', v_diferenca, trim(p_observacao), auth.uid());
end;
$$;

revoke all on function public.registrar_entrada_pingentes(uuid, int, uuid) from public, anon;
grant execute on function public.registrar_entrada_pingentes(uuid, int, uuid) to authenticated;
revoke all on function public.ajuste_manual_pingentes(uuid, int, text, uuid) from public, anon;
grant execute on function public.ajuste_manual_pingentes(uuid, int, text, uuid) to authenticated;

-- A baixa automática também valida escopo e impede saldo negativo. Como roda
-- no mesmo transaction do atendimento, qualquer falha desfaz o lançamento.
create or replace function public.deduct_pingente_on_atendimento()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_unidade_id uuid;
  v_saldo int;
begin
  select role, unidade_id into v_role, v_unidade_id
  from public.profiles
  where id = auth.uid() and ativo = true;

  if v_role is null
     or (v_role = 'pdv' and new.unidade_id is distinct from v_unidade_id)
     or v_role not in ('admin', 'pdv') then
    raise exception 'Acesso não autorizado para registrar este atendimento.';
  end if;

  select saldo_pingentes into v_saldo
  from public.unidades
  where id = new.unidade_id and ativa = true
  for update;

  if not found then
    raise exception 'Unidade ativa não encontrada.';
  end if;
  if v_saldo < 1 then
    raise exception 'Saldo de pingentes insuficiente.';
  end if;

  update public.unidades set saldo_pingentes = saldo_pingentes - 1 where id = new.unidade_id;
  insert into public.movimentacoes_pingentes
    (unidade_id, tipo, quantidade, observacao, realizado_por)
  values
    (new.unidade_id, 'saida', 1, 'Saída automática - atendimento ' || new.id::text, auth.uid());

  return new;
end;
$$;

-- A operação histórica chamada delete_user passa a ser reversível. O usuário
-- fica inativo e bloqueado, preservando todas as chaves estrangeiras e auditoria.
create or replace function public.delete_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_target_role text;
  v_admin_count int;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Apenas admin pode desativar usuários.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'Você não pode desativar o próprio acesso.';
  end if;

  select role into v_target_role from public.profiles where id = p_user_id;
  if v_target_role is null then
    raise exception 'Usuário não encontrado.';
  end if;

  if v_target_role = 'admin' then
    select count(*) into v_admin_count
    from public.profiles
    where role = 'admin' and ativo = true;
    if v_admin_count <= 1 then
      raise exception 'Não é possível desativar o último administrador.';
    end if;
  end if;

  update public.profiles set ativo = false where id = p_user_id;
  update auth.users
  set banned_until = now() + interval '100 years'
  where id = p_user_id;

  insert into public.audit_logs
    (usuario_id, unidade_id, entidade, entidade_id, acao, dados_novos)
  select auth.uid(), unidade_id, 'profiles', id, 'desativar_acesso',
         jsonb_build_object('ativo', false)
  from public.profiles where id = p_user_id;
end;
$$;

revoke all on function public.delete_user(uuid) from public, anon;
grant execute on function public.delete_user(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Atendimento: unidade edita somente registros do próprio dia; admin mantém
-- poder de correção. Toda alteração fica registrada.
-- ---------------------------------------------------------------------------

create or replace function public.guard_atendimento_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_unidade_id uuid;
begin
  select role, unidade_id into v_role, v_unidade_id
  from public.profiles
  where id = auth.uid() and ativo = true;

  if v_role = 'admin' then
    return new;
  end if;
  if v_role <> 'pdv' or old.unidade_id is distinct from v_unidade_id then
    raise exception 'Acesso não autorizado para alterar este atendimento.';
  end if;
  if new.id is distinct from old.id
     or new.unidade_id is distinct from old.unidade_id
     or new.criado_em is distinct from old.criado_em then
    raise exception 'Identidade, unidade e data do atendimento não podem ser alteradas.';
  end if;
  if (old.criado_em at time zone 'America/Sao_Paulo')::date
      <> (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'A unidade só pode editar atendimentos registrados hoje.';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_atendimento_update on public.atendimentos;
create trigger guard_atendimento_update
  before update on public.atendimentos
  for each row execute function public.guard_atendimento_update();

create or replace function public.audit_atendimento_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs
    (usuario_id, unidade_id, entidade, entidade_id, acao, dados_anteriores, dados_novos)
  values
    (auth.uid(), new.unidade_id, 'atendimentos', new.id, 'atualizar', to_jsonb(old), to_jsonb(new));
  return new;
end;
$$;

drop trigger if exists audit_atendimento_update on public.atendimentos;
create trigger audit_atendimento_update
  after update on public.atendimentos
  for each row
  when (old is distinct from new)
  execute function public.audit_atendimento_update();

-- ---------------------------------------------------------------------------
-- Índices para volume alto e filtros combinados.
-- ---------------------------------------------------------------------------

create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_atendimentos_criado_em
  on public.atendimentos (criado_em desc);
create index if not exists idx_atendimentos_unidade_periodo
  on public.atendimentos (unidade_id, criado_em desc);
create index if not exists idx_atendimentos_unidade_status_periodo
  on public.atendimentos (unidade_id, arquivado, criado_em desc);
create index if not exists idx_atendimentos_vendedora_interna_periodo
  on public.atendimentos (vendedora_interna_id, criado_em desc);
create index if not exists idx_atendimentos_vendedora_parceira_periodo
  on public.atendimentos (vendedora_parceira_id, criado_em desc);
create index if not exists idx_atendimentos_arquivado_periodo
  on public.atendimentos (arquivado, criado_em desc);
create index if not exists idx_lojas_parceiras_unidade_nome
  on public.lojas_parceiras (unidade_id, nome);
create index if not exists idx_vendedoras_internas_unidade_nome
  on public.vendedoras_internas (unidade_id, nome);
create index if not exists idx_vendedoras_parceiras_loja_nome
  on public.vendedoras_parceiras (loja_parceira_id, nome);
create index if not exists idx_movimentacoes_unidade_periodo
  on public.movimentacoes_pingentes (unidade_id, criado_em desc);
create index if not exists idx_audit_logs_periodo
  on public.audit_logs (criado_em desc);
create index if not exists idx_atendimentos_cliente_busca
  on public.atendimentos using gin (nome_cliente extensions.gin_trgm_ops);
create index if not exists idx_atendimentos_boleta_busca
  on public.atendimentos using gin (numero_boleta extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Dashboard: retorna uma única linha JSON com agregações exatas. O limite de
-- 1.000 linhas do PostgREST não interfere em COUNT/SUM/GROUP BY no PostgreSQL.
-- ---------------------------------------------------------------------------

create or replace function public.dashboard_metricas(
  p_inicio timestamptz,
  p_fim timestamptz,
  p_unidade_id uuid default null,
  p_loja_id uuid default null,
  p_vendedora_parceira_id uuid default null,
  p_vendedora_interna_id uuid default null,
  p_houve_venda boolean default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_unidade uuid;
  v_scope_unidade uuid;
  v_result jsonb;
begin
  select role, unidade_id into v_role, v_user_unidade
  from public.profiles
  where id = auth.uid() and ativo = true;

  if v_role = 'pdv' then
    if p_unidade_id is not null and p_unidade_id is distinct from v_user_unidade then
      raise exception 'Acesso não autorizado para esta unidade.';
    end if;
    v_scope_unidade := v_user_unidade;
  elsif v_role = 'admin' then
    v_scope_unidade := p_unidade_id;
  else
    raise exception 'Acesso não autorizado.';
  end if;

  if p_inicio is null or p_fim is null or p_fim <= p_inicio then
    raise exception 'Período inválido.';
  end if;

  with filtrados as materialized (
    select
      a.id, a.criado_em, a.unidade_id, u.nome as unidade_nome,
      a.vendedora_interna_id, vi.nome as vendedora_interna_nome,
      a.vendedora_parceira_id, vp.nome as vendedora_parceira_nome,
      lp.id as loja_id, lp.nome as loja_nome,
      a.houve_venda, coalesce(a.valor_venda, 0)::numeric as valor_venda,
      coalesce(a.qtd_produtos, 0)::numeric as qtd_produtos
    from public.atendimentos a
    join public.unidades u on u.id = a.unidade_id
    join public.vendedoras_internas vi on vi.id = a.vendedora_interna_id
    join public.vendedoras_parceiras vp on vp.id = a.vendedora_parceira_id
    join public.lojas_parceiras lp on lp.id = vp.loja_parceira_id
    where a.arquivado = false
      and a.criado_em >= p_inicio
      and a.criado_em < p_fim
      and (v_scope_unidade is null or a.unidade_id = v_scope_unidade)
      and (p_loja_id is null or lp.id = p_loja_id)
      and (p_vendedora_parceira_id is null or a.vendedora_parceira_id = p_vendedora_parceira_id)
      and (p_vendedora_interna_id is null or a.vendedora_interna_id = p_vendedora_interna_id)
      and (p_houve_venda is null or a.houve_venda = p_houve_venda)
  ), resumo as (
    select
      count(*)::bigint as atendimentos,
      count(*) filter (where houve_venda)::bigint as vendas,
      coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento,
      coalesce(sum(qtd_produtos) filter (where houve_venda), 0)::numeric as produtos
    from filtrados
  ), por_unidade as (
    select unidade_id as id, unidade_nome as nome,
           count(*)::bigint as atendimentos,
           count(*) filter (where houve_venda)::bigint as vendas,
           coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento
    from filtrados group by unidade_id, unidade_nome
  ), por_loja as (
    select loja_id as id, loja_nome as nome,
           count(*)::bigint as atendimentos,
           count(*) filter (where houve_venda)::bigint as vendas,
           coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento
    from filtrados group by loja_id, loja_nome
  ), por_vendedora_parceira as (
    select vendedora_parceira_id as id, vendedora_parceira_nome as nome,
           loja_nome,
           count(*)::bigint as atendimentos,
           count(*) filter (where houve_venda)::bigint as vendas,
           coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento
    from filtrados group by vendedora_parceira_id, vendedora_parceira_nome, loja_nome
  ), por_vendedora_interna as (
    select vendedora_interna_id as id, vendedora_interna_nome as nome,
           count(*)::bigint as atendimentos,
           count(*) filter (where houve_venda)::bigint as vendas,
           coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento
    from filtrados group by vendedora_interna_id, vendedora_interna_nome
  ), por_dia as (
    select (criado_em at time zone 'America/Sao_Paulo')::date as dia,
           count(*)::bigint as atendimentos,
           count(*) filter (where houve_venda)::bigint as vendas,
           coalesce(sum(valor_venda) filter (where houve_venda), 0)::numeric as faturamento
    from filtrados
    group by (criado_em at time zone 'America/Sao_Paulo')::date
  )
  select jsonb_build_object(
    'resumo', jsonb_build_object(
      'atendimentos', r.atendimentos,
      'vendas', r.vendas,
      'conversao', case when r.atendimentos = 0 then 0 else round((r.vendas::numeric / r.atendimentos) * 100, 2) end,
      'faturamento', r.faturamento,
      'ticket_medio', case when r.vendas = 0 then 0 else round(r.faturamento / r.vendas, 2) end,
      'produtos', r.produtos,
      'media_produtos', case when r.vendas = 0 then 0 else round(r.produtos / r.vendas, 2) end
    ),
    'por_unidade', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object(
      'conversao', case when x.atendimentos = 0 then 0 else round((x.vendas::numeric / x.atendimentos) * 100, 2) end,
      'ticket_medio', case when x.vendas = 0 then 0 else round(x.faturamento / x.vendas, 2) end
    ) order by x.atendimentos desc) from por_unidade x), '[]'::jsonb),
    'por_loja', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object(
      'conversao', case when x.atendimentos = 0 then 0 else round((x.vendas::numeric / x.atendimentos) * 100, 2) end,
      'ticket_medio', case when x.vendas = 0 then 0 else round(x.faturamento / x.vendas, 2) end
    ) order by x.atendimentos desc) from por_loja x), '[]'::jsonb),
    'por_vendedora_parceira', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object(
      'conversao', case when x.atendimentos = 0 then 0 else round((x.vendas::numeric / x.atendimentos) * 100, 2) end
    ) order by x.atendimentos desc) from por_vendedora_parceira x), '[]'::jsonb),
    'por_vendedora_interna', coalesce((select jsonb_agg(to_jsonb(x) || jsonb_build_object(
      'conversao', case when x.atendimentos = 0 then 0 else round((x.vendas::numeric / x.atendimentos) * 100, 2) end
    ) order by x.atendimentos desc) from por_vendedora_interna x), '[]'::jsonb),
    'por_dia', coalesce((select jsonb_agg(to_jsonb(x) order by x.dia) from por_dia x), '[]'::jsonb)
  ) into v_result
  from resumo r;

  return v_result;
end;
$$;

revoke all on function public.dashboard_metricas(timestamptz, timestamptz, uuid, uuid, uuid, uuid, boolean) from public, anon;
grant execute on function public.dashboard_metricas(timestamptz, timestamptz, uuid, uuid, uuid, uuid, boolean) to authenticated;

-- Saúde das parcerias sem buscar atendimentos brutos para o navegador.
create or replace function public.parceiros_metricas(
  p_inicio timestamptz,
  p_unidade_id uuid default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result jsonb;
begin
  if public.current_user_role() <> 'admin' then
    raise exception 'Apenas o administrador pode consultar esta visão.';
  end if;
  if p_inicio is null then
    raise exception 'Período inválido.';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', lp.id,
    'nome', lp.nome,
    'unidade_id', lp.unidade_id,
    'unidade_nome', u.nome,
    'atendimentos', coalesce(m.atendimentos, 0),
    'vendas', coalesce(m.vendas, 0),
    'faturamento', coalesce(m.faturamento, 0),
    'atendimentos_5d', coalesce(m.atendimentos_5d, 0),
    'ultimo_atendimento', m.ultimo_atendimento,
    'vendedoras', coalesce(v.items, '[]'::jsonb)
  ) order by u.nome, lp.nome), '[]'::jsonb)
  into v_result
  from public.lojas_parceiras lp
  join public.unidades u on u.id = lp.unidade_id
  left join lateral (
    select
      count(a.id) filter (where a.criado_em >= p_inicio)::bigint as atendimentos,
      count(a.id) filter (where a.criado_em >= p_inicio and a.houve_venda)::bigint as vendas,
      coalesce(sum(a.valor_venda) filter (where a.criado_em >= p_inicio and a.houve_venda), 0)::numeric as faturamento,
      count(a.id) filter (where a.criado_em >= now() - interval '5 days')::bigint as atendimentos_5d,
      max(a.criado_em) as ultimo_atendimento
    from public.vendedoras_parceiras vp
    left join public.atendimentos a on a.vendedora_parceira_id = vp.id and a.arquivado = false
    where vp.loja_parceira_id = lp.id
  ) m on true
  left join lateral (
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'nome', s.nome,
      'atendimentos', s.atendimentos, 'vendas', s.vendas,
      'faturamento', s.faturamento,
      'conversao', case when s.atendimentos = 0 then 0 else round((s.vendas::numeric / s.atendimentos) * 100, 2) end
    ) order by s.atendimentos desc, s.nome) as items
    from (
      select vp.id, vp.nome,
        count(a.id)::bigint as atendimentos,
        count(a.id) filter (where a.houve_venda)::bigint as vendas,
        coalesce(sum(a.valor_venda) filter (where a.houve_venda), 0)::numeric as faturamento
      from public.vendedoras_parceiras vp
      left join public.atendimentos a
        on a.vendedora_parceira_id = vp.id
       and a.arquivado = false
       and a.criado_em >= p_inicio
      where vp.loja_parceira_id = lp.id
      group by vp.id, vp.nome
    ) s
  ) v on true
  where lp.ativa = true
    and (p_unidade_id is null or lp.unidade_id = p_unidade_id);

  return v_result;
end;
$$;

revoke all on function public.parceiros_metricas(timestamptz, uuid) from public, anon;
grant execute on function public.parceiros_metricas(timestamptz, uuid) to authenticated;

-- Lista paginada e pesquisável. Retorna uma única linha JSON, portanto o total
-- e as páginas não dependem do limite de linhas do PostgREST.
create or replace function public.listar_atendimentos(
  p_inicio timestamptz default null,
  p_fim timestamptz default null,
  p_unidade_id uuid default null,
  p_loja_id uuid default null,
  p_vendedora_parceira_id uuid default null,
  p_vendedora_interna_id uuid default null,
  p_houve_venda boolean default null,
  p_arquivado boolean default false,
  p_busca text default null,
  p_pagina int default 1,
  p_por_pagina int default 50
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_role text;
  v_user_unidade uuid;
  v_scope_unidade uuid;
  v_pagina int := greatest(coalesce(p_pagina, 1), 1);
  v_por_pagina int := least(greatest(coalesce(p_por_pagina, 50), 10), 100);
  v_result jsonb;
begin
  select role, unidade_id into v_role, v_user_unidade
  from public.profiles
  where id = auth.uid() and ativo = true;

  if v_role = 'pdv' then
    if p_unidade_id is not null and p_unidade_id is distinct from v_user_unidade then
      raise exception 'Acesso não autorizado para esta unidade.';
    end if;
    v_scope_unidade := v_user_unidade;
  elsif v_role = 'admin' then
    v_scope_unidade := p_unidade_id;
  else
    raise exception 'Acesso não autorizado.';
  end if;

  with filtrados as materialized (
    select
      a.id, a.criado_em, a.nome_cliente, a.unidade_id,
      u.nome as unidade_nome,
      a.vendedora_interna_id, vi.nome as vendedora_interna_nome,
      a.vendedora_parceira_id, vp.nome as vendedora_parceira_nome,
      lp.id as loja_id, lp.nome as loja_nome,
      a.houve_venda, a.valor_venda, a.numero_boleta, a.qtd_produtos, a.arquivado
    from public.atendimentos a
    join public.unidades u on u.id = a.unidade_id
    join public.vendedoras_internas vi on vi.id = a.vendedora_interna_id
    join public.vendedoras_parceiras vp on vp.id = a.vendedora_parceira_id
    join public.lojas_parceiras lp on lp.id = vp.loja_parceira_id
    where a.arquivado = p_arquivado
      and (p_inicio is null or a.criado_em >= p_inicio)
      and (p_fim is null or a.criado_em < p_fim)
      and (v_scope_unidade is null or a.unidade_id = v_scope_unidade)
      and (p_loja_id is null or lp.id = p_loja_id)
      and (p_vendedora_parceira_id is null or a.vendedora_parceira_id = p_vendedora_parceira_id)
      and (p_vendedora_interna_id is null or a.vendedora_interna_id = p_vendedora_interna_id)
      and (p_houve_venda is null or a.houve_venda = p_houve_venda)
      and (
        nullif(trim(p_busca), '') is null
        or a.nome_cliente ilike '%' || trim(p_busca) || '%'
        or coalesce(a.numero_boleta, '') ilike '%' || trim(p_busca) || '%'
      )
  ), pagina as (
    select * from filtrados
    order by criado_em desc, id desc
    offset (v_pagina - 1) * v_por_pagina
    limit v_por_pagina
  )
  select jsonb_build_object(
    'total', (select count(*) from filtrados),
    'pagina', v_pagina,
    'por_pagina', v_por_pagina,
    'itens', coalesce((select jsonb_agg(to_jsonb(p) order by p.criado_em desc, p.id desc) from pagina p), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.listar_atendimentos(timestamptz, timestamptz, uuid, uuid, uuid, uuid, boolean, boolean, text, int, int) from public, anon;
grant execute on function public.listar_atendimentos(timestamptz, timestamptz, uuid, uuid, uuid, uuid, boolean, boolean, text, int, int) to authenticated;

commit;
