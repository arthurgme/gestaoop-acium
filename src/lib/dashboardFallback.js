import { supabase } from './supabase'

const PAGE_SIZE = 1000

function summarize(items) {
  const atendimentos = items.length
  const vendas = items.filter((item) => item.houve_venda)
  const faturamento = vendas.reduce((total, item) => total + Number(item.valor_venda || 0), 0)
  const produtos = vendas.reduce((total, item) => total + Number(item.qtd_produtos || 0), 0)
  return {
    atendimentos,
    vendas: vendas.length,
    conversao: atendimentos ? Number(((vendas.length / atendimentos) * 100).toFixed(2)) : 0,
    faturamento,
    ticket_medio: vendas.length ? faturamento / vendas.length : 0,
    produtos,
    media_produtos: vendas.length ? produtos / vendas.length : 0,
  }
}

function group(items, getId, getName, getExtra = () => ({})) {
  const groups = new Map()
  for (const item of items) {
    const id = getId(item)
    if (!id) continue
    if (!groups.has(id)) groups.set(id, { id, nome: getName(item), items: [], ...getExtra(item) })
    groups.get(id).items.push(item)
  }
  return [...groups.values()].map(({ items: groupedItems, ...row }) => ({ ...row, ...summarize(groupedItems) }))
    .sort((a, b) => b.atendimentos - a.atendimentos)
}

export function aggregateDashboard(items) {
  return {
    resumo: summarize(items),
    por_unidade: group(items, (item) => item.unidade_id, (item) => item.unidade?.nome || '—'),
    por_loja: group(items, (item) => item.vendedora_parceira?.loja?.id, (item) => item.vendedora_parceira?.loja?.nome || '—'),
    por_vendedora_parceira: group(
      items,
      (item) => item.vendedora_parceira_id,
      (item) => item.vendedora_parceira?.nome || '—',
      (item) => ({ loja_nome: item.vendedora_parceira?.loja?.nome || '—' }),
    ),
    por_vendedora_interna: group(items, (item) => item.vendedora_interna_id, (item) => item.vendedora_interna?.nome || '—'),
    por_dia: [],
  }
}

export async function fetchDashboardFallback({ start, end, filters, lojaSellerIds }) {
  if (filters.loja && lojaSellerIds.length === 0) return aggregateDashboard([])

  function pageQuery(from, to, withCount = false) {
    let query = supabase.from('atendimentos').select(`
      id, criado_em, unidade_id, vendedora_interna_id, vendedora_parceira_id,
      houve_venda, valor_venda, qtd_produtos,
      unidade:unidades(nome),
      vendedora_interna:vendedoras_internas(nome),
      vendedora_parceira:vendedoras_parceiras(nome, loja:lojas_parceiras(id, nome))
    `, withCount ? { count: 'exact' } : undefined)
      .eq('arquivado', false)
      .gte('criado_em', start)
      .lt('criado_em', end)
      .order('criado_em', { ascending: false })
      .range(from, to)

    if (filters.unidade) query = query.eq('unidade_id', filters.unidade)
    if (filters.loja) query = query.in('vendedora_parceira_id', lojaSellerIds)
    if (filters.parceira) query = query.eq('vendedora_parceira_id', filters.parceira)
    if (filters.interna) query = query.eq('vendedora_interna_id', filters.interna)
    if (filters.venda !== '') query = query.eq('houve_venda', filters.venda === 'true')
    return query
  }

  const first = await pageQuery(0, PAGE_SIZE - 1, true)
  if (first.error) throw first.error
  const total = Number(first.count ?? first.data?.length ?? 0)
  const items = [...(first.data || [])]

  for (let from = PAGE_SIZE; from < total; from += PAGE_SIZE) {
    const page = await pageQuery(from, Math.min(from + PAGE_SIZE - 1, total - 1))
    if (page.error) throw page.error
    items.push(...(page.data || []))
  }

  return aggregateDashboard(items)
}
