-- Permite registrar atendimentos mesmo quando o estoque de pingentes está zerado.
-- O consumo continua sendo contabilizado e o saldo pode ficar negativo, mantendo
-- visível a quantidade que precisa ser reposta pela unidade.

begin;

create or replace function public.deduct_pingente_on_atendimento()
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

  if v_role is null
     or (v_role = 'pdv' and new.unidade_id is distinct from v_unidade_id)
     or v_role not in ('admin', 'pdv') then
    raise exception 'Acesso não autorizado para registrar este atendimento.';
  end if;

  perform 1
  from public.unidades
  where id = new.unidade_id and ativa = true
  for update;

  if not found then
    raise exception 'Unidade ativa não encontrada.';
  end if;

  update public.unidades
  set saldo_pingentes = saldo_pingentes - 1
  where id = new.unidade_id;

  insert into public.movimentacoes_pingentes
    (unidade_id, tipo, quantidade, observacao, realizado_por)
  values
    (new.unidade_id, 'saida', 1, 'Saída automática - atendimento ' || new.id::text, auth.uid());

  return new;
end;
$$;

revoke all on function public.deduct_pingente_on_atendimento()
  from public, anon, authenticated;

commit;
