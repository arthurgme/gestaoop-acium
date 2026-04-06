-- Tabela de configurações globais do sistema
create table public.configuracoes (
  chave text primary key,
  valor boolean not null default false
);

-- Valor padrão: não permite cadastro no lançamento
insert into public.configuracoes (chave, valor)
values ('permitir_cadastro_vendedora_lancamento', false);

alter table public.configuracoes enable row level security;

-- Admin lê e atualiza
create policy "Admin select configuracoes" on public.configuracoes
  for select using (current_user_role() = 'admin');

create policy "Admin update configuracoes" on public.configuracoes
  for update using (current_user_role() = 'admin');

-- PDV só lê
create policy "PDV select configuracoes" on public.configuracoes
  for select using (current_user_role() = 'pdv');
