-- Endurecimento pós-migração do core.
-- Remove exposição desnecessária de funções internas e cobre FKs frequentes.

begin;

-- Funções usadas exclusivamente por triggers não devem ser expostas como RPC.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.deduct_pingente_on_atendimento() from public, anon, authenticated;
revoke all on function public.guard_atendimento_update() from public, anon, authenticated;
revoke all on function public.audit_atendimento_update() from public, anon, authenticated;

-- Helpers de contexto são necessários somente para usuários autenticados e RLS.
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.current_user_unidade_id() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.current_user_unidade_id() to authenticated;

-- Evita reavaliar auth.uid() para cada linha e restringe a policy ao papel correto.
drop policy if exists "users read own profile" on public.profiles;
create policy "users read own profile"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id);

-- Índices de cobertura para relacionamentos usados em auditoria e administração.
create index if not exists idx_audit_logs_usuario_id
  on public.audit_logs (usuario_id);
create index if not exists idx_audit_logs_unidade_id
  on public.audit_logs (unidade_id);
create index if not exists idx_movimentacoes_realizado_por
  on public.movimentacoes_pingentes (realizado_por);
create index if not exists idx_profiles_unidade_id
  on public.profiles (unidade_id);

commit;
