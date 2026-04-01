-- Execute no SQL Editor do Supabase Dashboard
-- Adiciona campo username em profiles

alter table public.profiles add column if not exists username text unique;

-- Atualiza o trigger de criação de profile para incluir username
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, role, unidade_id, username)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'pdv'),
    (new.raw_user_meta_data->>'unidade_id')::uuid,
    new.raw_user_meta_data->>'username'
  );
  return new;
end;
$$ language plpgsql security definer;

-- Atualiza o username do admin existente
update public.profiles set username = 'admin' where role = 'admin' and username is null;
