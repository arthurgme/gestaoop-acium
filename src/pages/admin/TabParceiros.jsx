import { useState, useEffect, useMemo, Fragment } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDate } from '../../lib/format'

function StatusBadge({ status }) {
  const cfg = {
    INATIVA:   { label: 'Inativa',   cls: 'bg-red-100 text-red-700' },
    REATIVAR:  { label: 'Reativar',  cls: 'bg-orange-100 text-orange-700' },
    ATIVO:     { label: 'Ativo',     cls: 'bg-blue-100 text-blue-700' },
    BOM:       { label: 'Bom',       cls: 'bg-green-100 text-green-700' },
    EXCELENTE: { label: 'Excelente', cls: 'bg-amber-100 text-amber-700' },
  }
  const { label, cls } = cfg[status] || cfg.ATIVO
  return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>{label}</span>
}

export default function TabParceiros() {
  const [unidades, setUnidades] = useState([])
  const [parceirosMetricas, setParceirosMetricas] = useState([])
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [periodo, setPeriodo] = useState(30)
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')
  const [expandedLojaId, setExpandedLojaId] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [legendaOpen, setLegendaOpen] = useState(false)

  useEffect(() => {
    supabase.from('unidades').select('id, nome').order('nome').then(({ data }) => setUnidades(data || []))
  }, [])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setErro('')
      const periodoStart = new Date()
      periodoStart.setDate(periodoStart.getDate() - periodo)
      periodoStart.setHours(0, 0, 0, 0)
      const { data, error } = await supabase.rpc('parceiros_metricas', {
        p_inicio: periodoStart.toISOString(),
        p_unidade_id: filtroUnidade || null,
      })
      if (error) {
        setErro('Erro ao carregar dados.')
        setLoading(false)
        return
      }
      setParceirosMetricas(data || [])
      setLoading(false)
    }
    fetchData()
  }, [filtroUnidade, periodo])

  const { lojaRows, summaryCards } = useMemo(() => {
    const lojaRows = parceirosMetricas.map((loja) => {
      const atendimentos = Number(loja.atendimentos || 0)
      const vendas = Number(loja.vendas || 0)
      const faturamento = Number(loja.faturamento || 0)
      const atend5d = Number(loja.atendimentos_5d || 0)
      const conversao = atendimentos > 0 ? ((vendas / atendimentos) * 100).toFixed(1) : '0.0'
      const ultimoAt = loja.ultimo_atendimento ? new Date(loja.ultimo_atendimento) : null
      const diasSemAtividade = ultimoAt ? Math.floor((Date.now() - ultimoAt) / 86400000) : Infinity
      const mediaDiaria5d = atend5d / 5

      let status
      if (diasSemAtividade >= 7)      status = 'INATIVA'
      else if (diasSemAtividade >= 2) status = 'REATIVAR'
      else if (mediaDiaria5d >= 6)    status = 'EXCELENTE'
      else if (mediaDiaria5d >= 4)    status = 'BOM'
      else                            status = 'ATIVO'

      return {
        ...loja,
        unidadeNome: loja.unidade_nome || '—', atendimentos, vendas, faturamento,
        atend5d, conversao, ultimoAt, diasSemAtividade, status,
        vendedorasRow: (loja.vendedoras || []).map((item) => ({ ...item, atendimentos: Number(item.atendimentos), vendas: Number(item.vendas), faturamento: Number(item.faturamento) })),
      }
    })

    const filtered = [...lojaRows]
    const STATUS_ORDER = { INATIVA: 0, REATIVAR: 1, ATIVO: 2, BOM: 3, EXCELENTE: 4 }
    filtered.sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || a.nome.localeCompare(b.nome, 'pt-BR'))

    const counts = { INATIVA: 0, REATIVAR: 0, ATIVO: 0, BOM: 0, EXCELENTE: 0 }
    filtered.forEach(l => counts[l.status]++)

    const summaryCards = [
      { label: 'Total',     value: filtered.length,  color: 'bg-gray-50 text-gray-700',      ring: 'ring-gray-400',   status: '' },
      { label: 'Inativas',  value: counts.INATIVA,   color: 'bg-red-50 text-red-700',        ring: 'ring-red-400',    status: 'INATIVA' },
      { label: 'Reativar',  value: counts.REATIVAR,  color: 'bg-orange-50 text-orange-700',  ring: 'ring-orange-400', status: 'REATIVAR' },
      { label: 'Ativas',    value: counts.ATIVO,     color: 'bg-blue-50 text-blue-700',      ring: 'ring-blue-400',   status: 'ATIVO' },
      { label: 'Bom',       value: counts.BOM,       color: 'bg-green-50 text-green-700',    ring: 'ring-green-400',  status: 'BOM' },
      { label: 'Excelente', value: counts.EXCELENTE, color: 'bg-amber-50 text-amber-700',    ring: 'ring-amber-400',  status: 'EXCELENTE' },
    ]

    return { lojaRows: filtered, summaryCards }
  }, [parceirosMetricas])

  return (
    <div className="space-y-5">

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">Unidade</label>
          <select
            value={filtroUnidade}
            onChange={e => setFiltroUnidade(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 outline-none focus:ring-2 focus:ring-amber-500"
          >
            <option value="">Todas</option>
            {unidades.map(u => (
              <option key={u.id} value={u.id}>{u.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 font-medium mb-1">Período</label>
          <div className="flex gap-1">
            {[7, 15, 30, 60, 90].map(d => (
              <button
                key={d}
                onClick={() => setPeriodo(d)}
                className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors cursor-pointer ${
                  periodo === d ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
        </div>
        {loading && (
          <p className="text-sm text-gray-400 self-end">Carregando...</p>
        )}
      </div>

      {erro && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>
      )}

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {summaryCards.map(c => {
          const ativo = filtroStatus === c.status
          return (
            <button
              key={c.label}
              onClick={() => setFiltroStatus(s => s === c.status ? '' : c.status)}
              className={`rounded-xl p-4 text-left transition-all cursor-pointer ${c.color} ${ativo ? `ring-2 ${c.ring} scale-[1.03]` : 'opacity-80 hover:opacity-100'}`}
            >
              <p className="text-xs font-medium opacity-75">{c.label}</p>
              <p className="text-2xl font-bold mt-1">{c.value}</p>
            </button>
          )
        })}
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setLegendaOpen(o => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <div>
            <h3 className="font-semibold text-gray-800 text-sm">Legenda de status</h3>
            <p className="text-xs text-gray-400 mt-0.5">Como cada classificação é calculada</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${legendaOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {legendaOpen && (
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
            {[
              { status: 'INATIVA',   cls: 'bg-red-100 text-red-700',       descricao: 'Sem atendimento há 7 dias ou mais.' },
              { status: 'REATIVAR',  cls: 'bg-orange-100 text-orange-700', descricao: 'Sem atendimento há 2 a 6 dias.' },
              { status: 'ATIVO',     cls: 'bg-blue-100 text-blue-700',     descricao: 'Atendeu nos últimos 2 dias, mas média < 4 atend./dia nos últimos 5 dias.' },
              { status: 'BOM',       cls: 'bg-green-100 text-green-700',   descricao: 'Média entre 4 e 5,9 atendimentos/dia nos últimos 5 dias.' },
              { status: 'EXCELENTE', cls: 'bg-amber-100 text-amber-700',   descricao: 'Média de 6 ou mais atendimentos/dia nos últimos 5 dias.' },
            ].map(({ status, cls, descricao }) => (
              <div key={status} className="flex gap-3 items-start">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${cls}`}>{status.charAt(0) + status.slice(1).toLowerCase()}</span>
                <p className="text-gray-600 text-xs leading-relaxed">{descricao}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tabela de lojas */}
      <div className="bg-white rounded-xl shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
              <th className="w-8 px-3 py-3"></th>
              <th className="px-3 py-3 font-medium">Loja</th>
              <th className="px-3 py-3 font-medium">Unidade</th>
              <th className="px-3 py-3 font-medium">Status</th>
              <th className="px-3 py-3 font-medium text-right">Atend.</th>
              <th className="px-3 py-3 font-medium text-right">Vendas</th>
              <th className="px-3 py-3 font-medium text-right">Conversão</th>
              <th className="px-3 py-3 font-medium text-right">Faturamento</th>
              <th className="px-3 py-3 font-medium">Último At.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(filtroStatus ? lojaRows.filter(l => l.status === filtroStatus) : lojaRows).map(loja => (
              <Fragment key={loja.id}>
                <tr
                  onClick={() => setExpandedLojaId(id => id === loja.id ? null : loja.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <td className="px-3 py-3 text-gray-400">
                    <svg
                      className={`w-4 h-4 transition-transform ${expandedLojaId === loja.id ? 'rotate-90' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </td>
                  <td className="px-3 py-3 font-medium text-gray-800">{loja.nome}</td>
                  <td className="px-3 py-3 text-gray-600">{loja.unidadeNome}</td>
                  <td className="px-3 py-3">
                    <StatusBadge status={loja.status} />
                  </td>
                  <td className="px-3 py-3 text-right text-gray-700">{loja.atendimentos}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{loja.vendas}</td>
                  <td className="px-3 py-3 text-right text-gray-700">{loja.conversao}%</td>
                  <td className="px-3 py-3 text-right text-gray-700">{formatCurrency(loja.faturamento)}</td>
                  <td className="px-3 py-3 text-gray-600">
                    {loja.ultimoAt ? formatDate(loja.ultimoAt) : '—'}
                  </td>
                </tr>
                {expandedLojaId === loja.id && (
                  <tr className="bg-gray-50">
                    <td colSpan={9} className="px-0 py-0">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-gray-400 border-b border-gray-100">
                            <th className="pl-10 pr-3 py-2 text-left font-medium">→ Vendedora</th>
                            <th className="px-3 py-2 text-right font-medium">Atend.</th>
                            <th className="px-3 py-2 text-right font-medium">Vendas</th>
                            <th className="px-3 py-2 text-right font-medium">Conversão</th>
                            <th className="px-3 py-2 text-right font-medium pr-4">Faturamento</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {loja.vendedorasRow.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="pl-10 py-3 text-gray-400">Nenhuma vendedora cadastrada.</td>
                            </tr>
                          ) : (
                            loja.vendedorasRow.map(vp => (
                              <tr key={vp.id}>
                                <td className={`pl-10 pr-3 py-2 ${!vp.ativa ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                  {vp.nome}
                                </td>
                                <td className="px-3 py-2 text-right text-gray-600">{vp.atendimentos}</td>
                                <td className="px-3 py-2 text-right text-gray-600">{vp.vendas}</td>
                                <td className="px-3 py-2 text-right text-gray-600">{vp.conversao}%</td>
                                <td className="px-3 py-2 text-right text-gray-600 pr-4">{formatCurrency(vp.faturamento)}</td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        {(filtroStatus ? lojaRows.filter(l => l.status === filtroStatus) : lojaRows).length === 0 && !loading && (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">
            {filtroStatus ? 'Nenhuma loja com esse status.' : 'Nenhuma loja parceira ativa.'}
          </p>
        )}
      </div>

    </div>
  )
}
