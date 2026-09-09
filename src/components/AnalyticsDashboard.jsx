import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { formatCurrency } from '../lib/format'
import { formatRangeLabel, getDateRange } from '../lib/dateRanges'
import PeriodFilter from './PeriodFilter'
import { fetchDashboardFallback } from '../lib/dashboardFallback'

const emptyMetrics = {
  resumo: { atendimentos: 0, vendas: 0, conversao: 0, faturamento: 0, ticket_medio: 0, produtos: 0, media_produtos: 0 },
  por_unidade: [], por_loja: [], por_vendedora_parceira: [], por_vendedora_interna: [], por_dia: [],
}

function SelectField({ label, value, onChange, options, allLabel = 'Todos', disabled = false }) {
  return (
    <label className="field-label">
      {label}
      <select className="field-control mt-1" value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.nome}</option>)}
      </select>
    </label>
  )
}

function Ranking({ title, subtitle, rows, firstColumn = 'Nome', showStore = false }) {
  return (
    <section className="surface overflow-hidden">
      <div className="section-heading">
        <div><h3>{title}</h3><p>{subtitle}</p></div>
        <span className="count-badge">{rows.length}</span>
      </div>
      {rows.length === 0 ? <p className="empty-state">Sem dados para os filtros selecionados.</p> : (
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead><tr><th>{firstColumn}</th>{showStore && <th>Loja</th>}<th className="text-right">Atend.</th><th className="text-right">Vendas</th><th className="text-right">Conversão</th><th className="text-right">Faturamento</th><th className="text-right">Ticket médio</th></tr></thead>
            <tbody>{rows.map((row) => (
              <tr key={row.id}>
                <td className="font-semibold text-stone-800">{row.nome}</td>
                {showStore && <td>{row.loja_nome || '—'}</td>}
                <td className="text-right tabular-nums">{Number(row.atendimentos).toLocaleString('pt-BR')}</td>
                <td className="text-right tabular-nums">{Number(row.vendas).toLocaleString('pt-BR')}</td>
                <td className="text-right tabular-nums">{Number(row.conversao).toLocaleString('pt-BR')}%</td>
                <td className="text-right tabular-nums">{formatCurrency(Number(row.faturamento))}</td>
                <td className="text-right tabular-nums">{formatCurrency(Number(row.ticket_medio || 0))}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default function AnalyticsDashboard({ fixedUnidadeId = '', unidadeNome = '', isAdmin = false }) {
  const initialRange = getDateRange('this_month')
  const [preset, setPreset] = useState('this_month')
  const [custom, setCustom] = useState({ start: initialRange.startInput, end: initialRange.endInput })
  const [filters, setFilters] = useState({ unidade: fixedUnidadeId, loja: '', parceira: '', interna: '', venda: '' })
  const [references, setReferences] = useState({ unidades: [], lojas: [], parceiras: [], internas: [] })
  const [metrics, setMetrics] = useState(emptyMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [compatibilityMode, setCompatibilityMode] = useState(false)
  const range = useMemo(() => getDateRange(preset, new Date(), custom), [preset, custom])

  useEffect(() => {
    Promise.all([
      isAdmin ? supabase.from('unidades').select('id, nome').eq('ativa', true).order('nome') : Promise.resolve({ data: [] }),
      supabase.from('lojas_parceiras').select('id, nome, unidade_id').eq('ativa', true).order('nome'),
      supabase.from('vendedoras_parceiras').select('id, nome, loja_parceira_id, loja:lojas_parceiras(unidade_id)').eq('ativa', true).order('nome'),
      supabase.from('vendedoras_internas').select('id, nome, unidade_id').eq('ativa', true).order('nome'),
    ]).then(([unidades, lojas, parceiras, internas]) => setReferences({
      unidades: unidades.data || [], lojas: lojas.data || [], parceiras: parceiras.data || [], internas: internas.data || [],
    }))
  }, [isAdmin])

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    supabase.rpc('dashboard_metricas', {
      p_inicio: range.start,
      p_fim: range.end,
      p_unidade_id: fixedUnidadeId || filters.unidade || null,
      p_loja_id: filters.loja || null,
      p_vendedora_parceira_id: filters.parceira || null,
      p_vendedora_interna_id: filters.interna || null,
      p_houve_venda: filters.venda === '' ? null : filters.venda === 'true',
    }).then(async ({ data, error: queryError }) => {
      if (!active) return
      if (!queryError) {
        setCompatibilityMode(false)
        setMetrics(data || emptyMetrics)
        setLoading(false)
        return
      }

      try {
        const lojaSellerIds = references.parceiras.filter((item) => item.loja_parceira_id === filters.loja).map((item) => item.id)
        const fallback = await fetchDashboardFallback({
          start: range.start,
          end: range.end,
          filters: { ...filters, unidade: fixedUnidadeId || filters.unidade },
          lojaSellerIds,
        })
        if (!active) return
        setMetrics(fallback)
        setCompatibilityMode(true)
      } catch {
        if (active) setError('Não foi possível carregar o dashboard.')
      }
      setLoading(false)
    })
    return () => { active = false }
  }, [filters, fixedUnidadeId, range.start, range.end, references.parceiras])

  const unitId = fixedUnidadeId || filters.unidade
  const lojas = references.lojas.filter((item) => !unitId || item.unidade_id === unitId)
  const parceiras = references.parceiras.filter((item) => !filters.loja
    ? (!unitId || item.loja?.unidade_id === unitId)
    : item.loja_parceira_id === filters.loja)
  const internas = references.internas.filter((item) => !unitId || item.unidade_id === unitId)
  const summary = metrics.resumo || emptyMetrics.resumo
  const cards = [
    ['Atendimentos', Number(summary.atendimentos).toLocaleString('pt-BR')],
    ['Vendas', Number(summary.vendas).toLocaleString('pt-BR')],
    ['Conversão', `${Number(summary.conversao).toLocaleString('pt-BR')}%`],
    ['Faturamento', formatCurrency(Number(summary.faturamento))],
    ['Ticket médio', formatCurrency(Number(summary.ticket_medio))],
    ['Produtos por venda', Number(summary.media_produtos).toLocaleString('pt-BR')],
  ]

  function updateFilter(key, value) {
    setFilters((current) => {
      const next = { ...current, [key]: value }
      if (key === 'unidade') { next.loja = ''; next.parceira = ''; next.interna = '' }
      if (key === 'loja') next.parceira = ''
      return next
    })
  }

  return (
    <div className="space-y-5">
      <div className="page-intro">
        <div><p className="eyebrow">Visão operacional</p><h2>Dashboard de parcerias</h2><p>{unidadeNome || 'Todas as unidades'} · {formatRangeLabel(range)}</p></div>
        <div className="journey-line" aria-label="Fluxo da indicação"><span>Unidade</span><i>→</i><span>Loja</span><i>→</i><span>Vendedora</span><i>→</i><span>Atendimento</span><i>→</i><strong>Venda</strong></div>
      </div>

      <section className="surface p-4 sm:p-5 space-y-4">
        <PeriodFilter preset={preset} onPresetChange={setPreset} customStart={custom.start} customEnd={custom.end} onCustomChange={(key, value) => setCustom((current) => ({ ...current, [key]: value }))} />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 border-t border-stone-200 pt-4">
          {isAdmin && <SelectField label="Unidade" value={filters.unidade} onChange={(value) => updateFilter('unidade', value)} options={references.unidades} allLabel="Todas as unidades" />}
          <SelectField label="Loja parceira" value={filters.loja} onChange={(value) => updateFilter('loja', value)} options={lojas} allLabel="Todas as lojas" />
          <SelectField label="Vendedora parceira" value={filters.parceira} onChange={(value) => updateFilter('parceira', value)} options={parceiras} allLabel="Todas as vendedoras" />
          <SelectField label="Vendedora interna" value={filters.interna} onChange={(value) => updateFilter('interna', value)} options={internas} allLabel="Toda a equipe" />
          <SelectField label="Resultado" value={filters.venda} onChange={(value) => updateFilter('venda', value)} options={[{ id: 'true', nome: 'Com venda' }, { id: 'false', nome: 'Sem venda' }]} allLabel="Todos" />
        </div>
      </section>

      {error && <div className="alert-error">{error}</div>}
      {compatibilityMode && <div className="px-3 py-2 rounded-lg border border-amber-200 bg-amber-50 text-amber-800 text-xs">Modo de compatibilidade ativo: os dados foram carregados em páginas de 1.000 registros. A migração do banco continua recomendada para maior velocidade.</div>}
      <div className="metric-grid" aria-busy={loading}>
        {cards.map(([label, value], index) => <article key={label} className={`metric-card ${index === 3 ? 'metric-card-featured' : ''}`}><p>{label}</p><strong>{loading ? '—' : value}</strong></article>)}
      </div>

      {isAdmin && <Ranking title="Desempenho por unidade" subtitle="Compare volume, conversão e receita." rows={metrics.por_unidade || []} firstColumn="Unidade" />}
      <Ranking title="Lojas parceiras" subtitle="Onde as indicações estão virando venda." rows={metrics.por_loja || []} firstColumn="Loja" />
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <Ranking title="Vendedoras parceiras" subtitle="Origem das indicações." rows={metrics.por_vendedora_parceira || []} firstColumn="Vendedora" showStore />
        <Ranking title="Equipe da unidade" subtitle="Quem concluiu os atendimentos." rows={metrics.por_vendedora_interna || []} firstColumn="Vendedora" />
      </div>
    </div>
  )
}
