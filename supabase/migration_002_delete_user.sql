-- Execute no SQL Editor do Supabase Dashboard
-- Permite admin excluir usuários completamente (auth + profile)

create or replace function public.delete_user(p_user_id uuid)
returns void as $$
begin
  -- Verifica se quem chama é admin
  if public.current_user_role() <> 'admin' then
    raise exception 'Apenas admin pode excluir usuários';
  end if;

  -- Deleta o profile (cascade não se aplica nessa direção)
  delete from public.profiles where id = p_user_id;

  -- Deleta o auth user
  delete from auth.users where id = p_user_id;
end;
$$ language plpgsql security definer;
