-- Execute no SQL Editor do Supabase Dashboard
-- Importa lojas parceiras da planilha (migration_004)

do $$
declare
  v_parkshopping uuid;
  v_grande_rio   uuid;
  v_caxias       uuid;
begin
  select id into v_parkshopping
    from public.unidades where trim(lower(nome)) ilike '%parkshopping%' or trim(lower(nome)) ilike '%park shopping%' limit 1;

  select id into v_grande_rio
    from public.unidades where trim(lower(nome)) ilike '%grande rio%' or trim(lower(nome)) ilike '%granderio%' limit 1;

  select id into v_caxias
    from public.unidades where trim(lower(nome)) ilike '%caxias%' limit 1;

  if v_parkshopping is null then raise notice 'AVISO: Unidade ParkShopping não encontrada.'; end if;
  if v_grande_rio   is null then raise notice 'AVISO: Unidade Grande Rio não encontrada.';   end if;
  if v_caxias       is null then raise notice 'AVISO: Unidade Caxias não encontrada.';       end if;

  -- ── ParkShopping ────────────────────────────────────────────
  if v_parkshopping is not null then
    insert into public.lojas_parceiras (nome, unidade_id) values
      ('UsaFlex',         v_parkshopping),
      ('Democrata',       v_parkshopping),
      ('Loungerie',       v_parkshopping),
      ('Millon',          v_parkshopping),
      ('Natura',          v_parkshopping),
      ('Sonho dos Pés',   v_parkshopping),
      ('Sapatella',       v_parkshopping),
      ('Laser e Co.',     v_parkshopping),
      ('Alphabeto',       v_parkshopping),
      ('Avatim',          v_parkshopping),
      ('Peahi',           v_parkshopping),
      ('Mr Cat',          v_parkshopping),
      ('Reserva',         v_parkshopping),
      ('Lirith',          v_parkshopping),
      ('Constance',       v_parkshopping),
      ('World Free',      v_parkshopping),
      ('Cellaris',        v_parkshopping),
      ('Enzo',            v_parkshopping),
      ('Brinde',          v_parkshopping),
      ('Identidade',      v_parkshopping),
      ('Brinde Clientes', v_parkshopping),
      ('Espaço Laser',    v_parkshopping);
  end if;

  -- ── Grande Rio ──────────────────────────────────────────────
  if v_grande_rio is not null then
    insert into public.lojas_parceiras (nome, unidade_id) values
      ('Sapatela',      v_grande_rio),
      ('Sonho dos Pés', v_grande_rio),
      ('Linha Chic',    v_grande_rio),
      ('Laportier',     v_grande_rio),
      ('First Class',   v_grande_rio),
      ('Espaço Laser',  v_grande_rio),
      ('Peahi',         v_grande_rio),
      ('Quero Capa',    v_grande_rio),
      ('Constance',     v_grande_rio);
  end if;

  -- ── Caxias ──────────────────────────────────────────────────
  if v_caxias is not null then
    insert into public.lojas_parceiras (nome, unidade_id) values
      ('Rei do Mate',   v_caxias),
      ('Sonho dos Pés', v_caxias),
      ('Constance',     v_caxias),
      ('UsaFlex',       v_caxias),
      ('Aniversário',   v_caxias),
      ('Lupo',          v_caxias),
      ('Laser e Co',    v_caxias),
      ('Ação Shopping', v_caxias),
      ('Promo 350+',    v_caxias),
      ('W VIP',         v_caxias),
      ('Amazona',       v_caxias),
      ('Espaço Facial', v_caxias),
      ('Espaço Laser',  v_caxias);
  end if;
end $$;
