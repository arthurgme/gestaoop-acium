import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency, formatDateTime } from '../lib/format'

const PAGE_SIZE = 50

function Pagination({ page, total, onChange }) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  if (pages <= 1) return null
  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 text-sm">
      <span className="text-stone-500">Página {page} de {pages}</span>
      <div className="flex gap-2"><button className="period-pill" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</button><button className="period-pill" disabled={page >= pages} onClick={() => onChange(page + 1)}>Próxima</button></div>
    </div>
  )
}

function Rows({ items, isAdmin, archived, onToggle }) {
  return items.map((item) => (
    <tr key={item.id} className={archived ? 'opacity-60' : ''}>
      <td className="whitespace-nowrap">{formatDateTime(item.criado_em)}</td>
      {isAdmin && <td>{item.unidade_nome}</td>}
      <td className="font-semibold text-stone-800">{item.nome_cliente}</td>
      <td>{item.vendedora_interna_nome}</td><td>{item.loja_nome}</td><td>{item.vendedora_parceira_nome}</td>
      <td><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.houve_venda ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-500'}`}>{item.houve_venda ? 'Sim' : 'Não'}</span></td>
      <td>{item.houve_venda ? formatCurrency(item.valor_venda) : '—'}</td><td>{item.numero_boleta || '—'}</td><td>{item.qtd_produtos || '—'}</td>
      <td><button onClick={() => onToggle(item.id, !archived)} className={`text-xs font-semibold cursor-pointer ${archived ? 'text-emerald-700' : 'text-red-700'}`}>{archived ? 'Restaurar' : 'Arquivar'}</button></td>
    </tr>
  ))
}

export default function AttendanceList({ isAdmin = false }) {
  const [references, setReferences] = useState({ unidades: [], lojas: [], parceiras: [], internas: [] })
  const [filters, setFilters] = useState({ unidade: '', de: '', ate: '', loja: '', parceira: '', interna: '', busca: '' })
  const [active, setActive] = useState({ total: 0, itens: [] })
  const [archived, setArchived] = useState({ total: 0, itens: [] })
  const [showArchived, setShowArchived] = useState(false)
  const [page, setPage] = useState(1)
  const [archivedPage, setArchivedPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([
      isAdmin ? supabase.from('unidades').select('id, nome').order('nome') : Promise.resolve({ data: [] }),
      supabase.from('lojas_parceiras').select('id, nome, unidade_id').order('nome'),
      supabase.from('vendedoras_parceiras').select('id, nome, loja_parceira_id, loja:lojas_parceiras(unidade_id)').order('nome'),
      supabase.from('vendedoras_internas').select('id, nome, unidade_id').order('nome'),
    ]).then(([unidades, lojas, parceiras, internas]) => setReferences({ unidades: unidades.data || [], lojas: lojas.data || [], parceiras: parceiras.data || [], internas: internas.data || [] }))
  }, [isAdmin])

  const fetchRows = useCallback(async () => {
    setLoading(true)
    setError('')
    const common = {
      p_inicio: filters.de ? new Date(`${filters.de}T00:00:00`).toISOString() : null,
      p_fim: filters.ate ? new Date(new Date(`${filters.ate}T00:00:00`).setDate(new Date(`${filters.ate}T00:00:00`).getDate() + 1)).toISOString() : null,
      p_unidade_id: filters.unidade || null,
      p_loja_id: filters.loja || null,
      p_vendedora_parceira_id: filters.parceira || null,
      p_vendedora_interna_id: filters.interna || null,
      p_houve_venda: null,
      p_busca: filters.busca.trim() || null,
      p_por_pagina: PAGE_SIZE,
    }
    const [activeResult, archivedResult] = await Promise.all([
      supabase.rpc('listar_atendimentos', { ...common, p_arquivado: false, p_pagina: page }),
      supabase.rpc('listar_atendimentos', { ...common, p_arquivado: true, p_pagina: archivedPage }),
    ])
    if (activeResult.error || archivedResult.error) setError('Não foi possível listar os registros. Verifique se a migração do core foi aplicada.')
    setActive(activeResult.data || { total: 0, itens: [] })
    setArchived(archivedResult.data || { total: 0, itens: [] })
    setLoading(false)
  }, [filters, page, archivedPage])

  useEffect(() => { fetchRows() }, [fetchRows])

  const scoped = useMemo(() => {
    const unitId = filters.unidade
    const lojas = references.lojas.filter((item) => !unitId || item.unidade_id === unitId)
    const parceiras = references.parceiras.filter((item) => filters.loja ? item.loja_parceira_id === filters.loja : (!unitId || item.loja?.unidade_id === unitId))
    const internas = references.internas.filter((item) => !unitId || item.unidade_id === unitId)
    return { lojas, parceiras, internas }
  }, [references, filters.unidade, filters.loja])

  function updateFilter(key, value) {
    setPage(1); setArchivedPage(1)
    setFilters((current) => {
      const next = { ...current, [key]: value }
      if (key === 'unidade') { next.loja = ''; next.parceira = ''; next.interna = '' }
      if (key === 'loja') next.parceira = ''
      return next
    })
  }

  async function toggleArchived(id, value) {
    const { error: updateError } = await supabase.from('atendimentos').update({ arquivado: value }).eq('id', id)
    if (updateError) setError(updateError.message)
    else fetchRows()
  }

  const clear = () => { setFilters({ unidade: '', de: '', ate: '', loja: '', parceira: '', interna: '', busca: '' }); setPage(1); setArchivedPage(1) }

  return (
    <div className="space-y-5">
      <div className="page-intro"><div><p className="eyebrow">Histórico completo</p><h2>Atendimentos</h2><p>Busca e filtros processados no servidor, sem corte em 1.000 registros.</p></div></div>
      <section className="surface p-4 space-y-3">
        <input className="field-control" value={filters.busca} onChange={(event) => updateFilter('busca', event.target.value)} placeholder="Pesquisar por nome do cliente ou boleta..." />
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${isAdmin ? 'lg:grid-cols-6' : 'lg:grid-cols-5'} gap-3`}>
          {isAdmin && <label className="field-label">Unidade<select className="field-control mt-1" value={filters.unidade} onChange={(event) => updateFilter('unidade', event.target.value)}><option value="">Todas</option>{references.unidades.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>}
          <label className="field-label">De<input className="field-control mt-1" type="date" value={filters.de} onChange={(event) => updateFilter('de', event.target.value)} /></label>
          <label className="field-label">Até<input className="field-control mt-1" type="date" value={filters.ate} onChange={(event) => updateFilter('ate', event.target.value)} /></label>
          <label className="field-label">Loja parceira<select className="field-control mt-1" value={filters.loja} onChange={(event) => updateFilter('loja', event.target.value)}><option value="">Todas</option>{scoped.lojas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label className="field-label">Vendedora parceira<select className="field-control mt-1" value={filters.parceira} onChange={(event) => updateFilter('parceira', event.target.value)}><option value="">Todas</option>{scoped.parceiras.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
          <label className="field-label">Vendedora interna<select className="field-control mt-1" value={filters.interna} onChange={(event) => updateFilter('interna', event.target.value)}><option value="">Todas</option>{scoped.internas.map((item) => <option key={item.id} value={item.id}>{item.nome}</option>)}</select></label>
        </div>
        {Object.values(filters).some(Boolean) && <div className="text-right"><button onClick={clear} className="text-xs text-[#765718] font-semibold cursor-pointer">Limpar filtros</button></div>}
      </section>
      {error && <div className="alert-error">{error}</div>}
      <section className="surface overflow-hidden">
        <div className="section-heading"><div><h3>Atendimentos ativos</h3><p>{loading ? 'Carregando…' : `${Number(active.total).toLocaleString('pt-BR')} registros encontrados`}</p></div></div>
        {!loading && active.itens.length === 0 ? <p className="empty-state">Nenhum atendimento encontrado.</p> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Data</th>{isAdmin && <th>Unidade</th>}<th>Cliente</th><th>V. Interna</th><th>Loja</th><th>V. Parceira</th><th>Venda</th><th>Valor</th><th>Boleta</th><th>Prod.</th><th>Ações</th></tr></thead><tbody><Rows items={active.itens} isAdmin={isAdmin} archived={false} onToggle={toggleArchived} /></tbody></table></div>}
        <Pagination page={page} total={Number(active.total)} onChange={setPage} />
        <div className="border-t border-stone-200"><button onClick={() => setShowArchived((value) => !value)} className="w-full px-4 py-3 text-left text-xs text-stone-600 hover:bg-stone-50 font-semibold cursor-pointer">{showArchived ? 'Ocultar arquivados' : `Ver arquivados (${Number(archived.total).toLocaleString('pt-BR')})`}</button>
          {showArchived && <><div className="overflow-x-auto"><table className="data-table"><tbody><Rows items={archived.itens} isAdmin={isAdmin} archived onToggle={toggleArchived} /></tbody></table></div><Pagination page={archivedPage} total={Number(archived.total)} onChange={setArchivedPage} /></>}
        </div>
      </section>
    </div>
  )
}
