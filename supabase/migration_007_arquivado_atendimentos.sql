-- migration_007: add arquivado column to atendimentos + PDV update RLS policy
-- Execute no SQL Editor do Supabase Dashboard

alter table public.atendimentos
  add column arquivado boolean not null default false;

create policy "pdv update arquivado own unidade"
  on public.atendimentos for update
  using (unidade_id = public.current_user_unidade_id())
  with check (unidade_id = public.current_user_unidade_id());
