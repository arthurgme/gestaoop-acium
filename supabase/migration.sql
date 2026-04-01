-- ============================================================
-- Acium Voucher — Supabase Migration
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Tabela: unidades
create table public.unidades (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ativa boolean not null default true,
  saldo_pingentes int not null default 0
);

-- 2. Tabela: profiles (extensão de auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'pdv')),
  unidade_id uuid references public.unidades(id)
);

-- 3. Tabela: vendedoras_internas
create table public.vendedoras_internas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_id uuid not null references public.unidades(id),
  ativa boolean not null default true
);

-- 4. Tabela: lojas_parceiras
create table public.lojas_parceiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade_id uuid not null references public.unidades(id),
  ativa boolean not null default true
);

-- 5. Tabela: vendedoras_parceiras
create table public.vendedoras_parceiras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  loja_parceira_id uuid not null references public.lojas_parceiras(id) on delete cascade,
  ativa boolean not null default true
);

-- 6. Tabela: atendimentos
create table public.atendimentos (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  nome_cliente text not null,
  unidade_id uuid not null references public.unidades(id),
  vendedora_interna_id uuid not null references public.vendedoras_internas(id),
  vendedora_parceira_id uuid not null references public.vendedoras_parceiras(id),
  houve_venda boolean not null default false,
  valor_venda numeric,
  numero_boleta text,
  qtd_produtos int
);

-- 7. Tabela: movimentacoes_pingentes
create table public.movimentacoes_pingentes (
  id uuid primary key default gen_random_uuid(),
  criado_em timestamptz not null default now(),
  unidade_id uuid not null references public.unidades(id),
  tipo text not null check (tipo in ('entrada', 'saida', 'ajuste')),
  quantidade int not null,
  observacao text,
  realizado_por uuid not null references public.profiles(id)
);

-- ============================================================
-- Trigger: auto-create profile on signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role, unidade_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'pdv'),
    (new.raw_user_meta_data->>'unidade_id')::uuid
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Function + Trigger: auto deduct pingente on new atendimento
-- ============================================================
create or replace function public.deduct_pingente_on_atendimento()
returns trigger as $$
begin
  -- Decrement saldo
  update public.unidades
  set saldo_pingentes = saldo_pingentes - 1
  where id = new.unidade_id;

  -- Register movimentacao (realizado_por = current user)
  insert into public.movimentacoes_pingentes (unidade_id, tipo, quantidade, observacao, realizado_por)
  values (new.unidade_id, 'saida', 1, 'Saída automática - atendimento ' || new.id::text, auth.uid());

  return new;
end;
$$ language plpgsql security definer;

create trigger on_atendimento_created
  after insert on public.atendimentos
  for each row execute function public.deduct_pingente_on_atendimento();

-- ============================================================
-- Enable RLS on all tables
-- ============================================================
alter table public.unidades enable row level security;
alter table public.profiles enable row level security;
alter table public.vendedoras_internas enable row level security;
alter table public.lojas_parceiras enable row level security;
alter table public.vendedoras_parceiras enable row level security;
alter table public.atendimentos enable row level security;
alter table public.movimentacoes_pingentes enable row level security;

-- ============================================================
-- Helper: get current user's role and unidade_id
-- ============================================================
create or replace function public.current_user_role()
returns text as $$
  select role from public.profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function public.current_user_unidade_id()
returns uuid as $$
  select unidade_id from public.profiles where id = auth.uid();
$$ language sql stable security definer;

-- ============================================================
-- RLS Policies: unidades
-- ============================================================
create policy "admin full access on unidades"
  on public.unidades for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "pdv read own unidade"
  on public.unidades for select
  using (id = public.current_user_unidade_id());

-- ============================================================
-- RLS Policies: profiles
-- ============================================================
create policy "admin full access on profiles"
  on public.profiles for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "users read own profile"
  on public.profiles for select
  using (id = auth.uid());

-- ============================================================
-- RLS Policies: vendedoras_internas
-- ============================================================
create policy "admin full access on vendedoras_internas"
  on public.vendedoras_internas for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "pdv read own unidade vendedoras_internas"
  on public.vendedoras_internas for select
  using (unidade_id = public.current_user_unidade_id());

create policy "pdv manage own unidade vendedoras_internas"
  on public.vendedoras_internas for insert
  with check (unidade_id = public.current_user_unidade_id());

create policy "pdv update own unidade vendedoras_internas"
  on public.vendedoras_internas for update
  using (unidade_id = public.current_user_unidade_id())
  with check (unidade_id = public.current_user_unidade_id());

-- ============================================================
-- RLS Policies: lojas_parceiras
-- ============================================================
create policy "admin full access on lojas_parceiras"
  on public.lojas_parceiras for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "pdv read own unidade lojas_parceiras"
  on public.lojas_parceiras for select
  using (unidade_id = public.current_user_unidade_id());

create policy "pdv manage own unidade lojas_parceiras"
  on public.lojas_parceiras for insert
  with check (unidade_id = public.current_user_unidade_id());

create policy "pdv update own unidade lojas_parceiras"
  on public.lojas_parceiras for update
  using (unidade_id = public.current_user_unidade_id())
  with check (unidade_id = public.current_user_unidade_id());

-- ============================================================
-- RLS Policies: vendedoras_parceiras
-- ============================================================
create policy "admin full access on vendedoras_parceiras"
  on public.vendedoras_parceiras for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- pdv: read vendedoras_parceiras where loja belongs to their unidade
create policy "pdv read own unidade vendedoras_parceiras"
  on public.vendedoras_parceiras for select
  using (
    exists (
      select 1 from public.lojas_parceiras lp
      where lp.id = loja_parceira_id
      and lp.unidade_id = public.current_user_unidade_id()
    )
  );

create policy "pdv manage own unidade vendedoras_parceiras"
  on public.vendedoras_parceiras for insert
  with check (
    exists (
      select 1 from public.lojas_parceiras lp
      where lp.id = loja_parceira_id
      and lp.unidade_id = public.current_user_unidade_id()
    )
  );

create policy "pdv update own unidade vendedoras_parceiras"
  on public.vendedoras_parceiras for update
  using (
    exists (
      select 1 from public.lojas_parceiras lp
      where lp.id = loja_parceira_id
      and lp.unidade_id = public.current_user_unidade_id()
    )
  )
  with check (
    exists (
      select 1 from public.lojas_parceiras lp
      where lp.id = loja_parceira_id
      and lp.unidade_id = public.current_user_unidade_id()
    )
  );

-- ============================================================
-- RLS Policies: atendimentos
-- ============================================================
create policy "admin full access on atendimentos"
  on public.atendimentos for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "pdv read own unidade atendimentos"
  on public.atendimentos for select
  using (unidade_id = public.current_user_unidade_id());

create policy "pdv insert own unidade atendimentos"
  on public.atendimentos for insert
  with check (unidade_id = public.current_user_unidade_id());

-- ============================================================
-- RLS Policies: movimentacoes_pingentes
-- ============================================================
create policy "admin full access on movimentacoes_pingentes"
  on public.movimentacoes_pingentes for all
  using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

create policy "pdv read own unidade movimentacoes"
  on public.movimentacoes_pingentes for select
  using (unidade_id = public.current_user_unidade_id());

create policy "pdv insert entrada own unidade movimentacoes"
  on public.movimentacoes_pingentes for insert
  with check (
    unidade_id = public.current_user_unidade_id()
    and tipo = 'entrada'
  );

-- ============================================================
-- Function: registrar entrada de pingentes (incrementa saldo)
-- ============================================================
create or replace function public.registrar_entrada_pingentes(
  p_unidade_id uuid,
  p_quantidade int,
  p_realizado_por uuid
)
returns void as $$
begin
  update public.unidades
  set saldo_pingentes = saldo_pingentes + p_quantidade
  where id = p_unidade_id;

  insert into public.movimentacoes_pingentes (unidade_id, tipo, quantidade, realizado_por)
  values (p_unidade_id, 'entrada', p_quantidade, p_realizado_por);
end;
$$ language plpgsql security definer;

-- ============================================================
-- Function: ajuste manual de pingentes (admin only)
-- ============================================================
create or replace function public.ajuste_manual_pingentes(
  p_unidade_id uuid,
  p_novo_saldo int,
  p_observacao text,
  p_realizado_por uuid
)
returns void as $$
declare
  v_saldo_atual int;
  v_diferenca int;
begin
  select saldo_pingentes into v_saldo_atual
  from public.unidades where id = p_unidade_id;

  v_diferenca := p_novo_saldo - v_saldo_atual;

  update public.unidades
  set saldo_pingentes = p_novo_saldo
  where id = p_unidade_id;

  insert into public.movimentacoes_pingentes (unidade_id, tipo, quantidade, observacao, realizado_por)
  values (p_unidade_id, 'ajuste', v_diferenca, p_observacao, p_realizado_por);
end;
$$ language plpgsql security definer;
