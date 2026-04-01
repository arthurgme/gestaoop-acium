-- Remove todas as vendedoras internas da unidade Grande Rio
-- Execute no SQL Editor do Supabase Dashboard

delete from public.vendedoras_internas
where unidade_id = (
  select id from public.unidades where trim(lower(nome)) ilike '%grande rio%' limit 1
);
