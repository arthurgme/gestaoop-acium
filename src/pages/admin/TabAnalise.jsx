import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../lib/format'

export default function TabAnalise() {
  const [unidades, setUnidades] = useState([])
  const [lojasParceiras, setLojasParceiras] = useState([])
  const [vendedorasParceiras, setVendedorasParceiras] = useState([])
  const [vendedorasInternas, setVendedorasInternas] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [loading, setLoading] = useState(false)

  // Filters
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroDe, setFiltroDe] = useState('')
  const [filtroAte, setFiltroAte] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroVendedoraParceira, setFiltroVendedoraParceira] = useState('')
  const [filtroVendedoraInterna, setFiltroVendedoraInterna] = useState('')

  useEffect(() => {
    Promise.all([
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('lojas_parceiras').select('*').order('nome'),
      supabase.from('vendedoras_parceiras').select('*, loja:lojas_parceiras(nome, unidade_id)').order('nome'),
      supabase.from('vendedoras_internas').select('*').order('nome'),
    ]).then(([u, l, vp, vi]) => {
      setUnidades(u.data || [])
      setLojasParceiras(l.data || [])
      setVendedorasParceiras(vp.data || [])
      setVendedorasInternas(vi.data || [])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    let query = supabase
      .from('atendimentos')
      .select(`
        *,
        unidade:unidades(nome),
        vendedora_interna:vendedoras_internas(nome),
        vendedora_parceira:vendedoras_parceiras(nome, loja:lojas_parceiras(nome))
      `)
      .order('criado_em', { ascending: false })
      .limit(200)

    if (filtroUnidade) query = query.eq('unidade_id', filtroUnidade)
    if (filtroDe) query = query.gte('criado_em', new Date(filtroDe).toISOString())
    if (filtroAte) {
      const end = new Date(filtroAte)
      end.setHours(23, 59, 59, 999)
      query = query.lte('criado_em', end.toISOString())
    }
    if (filtroVendedoraParceira) query = query.eq('vendedora_parceira_id', filtroVendedoraParceira)
    if (filtroVendedoraInterna) query = query.eq('vendedora_interna_id', filtroVendedoraInterna)

    query.then(({ data }) => {
      let items = data || []
      // Client-side filter for loja parceira (via vendedora_parceira)
      if (filtroLoja) {
        items = items.filter((a) => a.vendedora_parceira?.loja?.nome === lojasParceiras.find((l) => l.id === filtroLoja)?.nome)
      }
      setAtendimentos(items)
      setLoading(false)
    })
  }, [filtroUnidade, filtroDe, filtroAte, filtroLoja, filtroVendedoraParceira, filtroVendedoraInterna, lojasParceiras])

  // Metrics
  const totalAtendimentos = atendimentos.length
  const vendas = atendimentos.filter((a) => a.houve_venda)
  const totalVendas = vendas.length
  const taxaConversao = totalAtendimentos > 0 ? ((totalVendas / totalAtendimentos) * 100).toFixed(1) : '0.0'
  const faturamento = vendas.reduce((sum, a) => sum + (parseFloat(a.valor_venda) || 0), 0)
  const ticketMedio = totalVendas > 0 ? faturamento / totalVendas : 0
  const totalProdutos = vendas.reduce((sum, a) => sum + (a.qtd_produtos || 0), 0)
  const mediaProdutos = totalVendas > 0 ? (totalProdutos / totalVendas).toFixed(1) : '0.0'

  const filteredLojas = filtroUnidade
    ? lojasParceiras.filter((l) => l.unidade_id === filtroUnidade)
    : lojasParceiras
  const filteredVparceiras = filtroLoja
    ? vendedorasParceiras.filter((v) => v.loja_parceira_id === filtroLoja)
    : filtroUnidade
      ? vendedorasParceiras.filter((v) => v.loja?.unidade_id === filtroUnidade)
      : vendedorasParceiras
  const filteredVinternas = filtroUnidade
    ? vendedorasInternas.filter((v) => v.unidade_id === filtroUnidade)
    : vendedorasInternas

  // ── Funções de agrupamento ──────────────────────────────────
  function calcMetrics(items) {
    const vendas = items.filter((a) => a.houve_venda)
    const totalAtend = items.length
    const totalVend = vendas.length
    const fat = vendas.reduce((s, a) => s + (parseFloat(a.valor_venda) || 0), 0)
    const prods = vendas.reduce((s, a) => s + (a.qtd_produtos || 0), 0)
    return {
      atendimentos: totalAtend,
      vendas: totalVend,
      conversao: totalAtend > 0 ? ((totalVend / totalAtend) * 100).toFixed(1) : '0.0',
      faturamento: fat,
      ticketMedio: totalVend > 0 ? fat / totalVend : 0,
      mediaProdutos: totalVend > 0 ? (prods / totalVend).toFixed(1) : '0.0',
    }
  }

  function groupBy(items, keyFn, labelFn, extraFn) {
    const map = new Map()
    items.forEach((a) => {
      const k = keyFn(a)
      if (!k) return
      if (!map.has(k)) map.set(k, { label: labelFn(a), extra: extraFn ? extraFn(a) : null, items: [] })
      map.get(k).items.push(a)
    })
    return Array.from(map.values())
      .map((g) => ({ ...g, ...calcMetrics(g.items) }))
      .sort((a, b) => b.atendimentos - a.atendimentos)
  }

  const porVendedoraInterna = groupBy(
    atendimentos,
    (a) => a.vendedora_interna_id,
    (a) => a.vendedora_interna?.nome || '—',
  )

  const porVendedoraParceira = groupBy(
    atendimentos,
    (a) => a.vendedora_parceira_id,
    (a) => a.vendedora_parceira?.nome || '—',
    (a) => a.vendedora_parceira?.loja?.nome || '—',
  )

  const porLojaParceira = groupBy(
    atendimentos,
    (a) => a.vendedora_parceira?.loja?.nome || null,
    (a) => a.vendedora_parceira?.loja?.nome || '—',
  )

  const cards = [
    { label: 'Atendimentos', value: totalAtendimentos, color: 'bg-blue-50 text-blue-700' },
    { label: 'Vendas', value: totalVendas, color: 'bg-green-50 text-green-700' },
    { label: 'Conversão', value: `${taxaConversao}%`, color: 'bg-purple-50 text-purple-700' },
    { label: 'Ticket Médio', value: formatCurrency(ticketMedio), color: 'bg-orange-50 text-orange-700' },
    { label: 'Faturamento', value: formatCurrency(faturamento), color: 'bg-amber-50 text-amber-700' },
    { label: 'Média Prod./Venda', value: mediaProdutos, color: 'bg-indigo-50 text-indigo-700' },
  ]

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl shadow p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
            <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="">Todas</option>
              {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">De</label>
            <input type="date" value={filtroDe} onChange={(e) => setFiltroDe(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Até</label>
            <input type="date" value={filtroAte} onChange={(e) => setFiltroAte(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Loja Parceira</label>
            <select value={filtroLoja} onChange={(e) => setFiltroLoja(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="">Todas</option>
              {filteredLojas.map((l) => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vend. Parceira</label>
            <select value={filtroVendedoraParceira} onChange={(e) => setFiltroVendedoraParceira(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="">Todas</option>
              {filteredVparceiras.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Vend. Interna</label>
            <select value={filtroVendedoraInterna} onChange={(e) => setFiltroVendedoraInterna(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
              <option value="">Todas</option>
              {filteredVinternas.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-4 ${c.color}`}>
            <p className="text-xs font-medium opacity-75">{c.label}</p>
            <p className="text-2xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Atendimentos</h3>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
        ) : atendimentos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum atendimento encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Unidade</th>
                  <th className="px-4 py-3 font-medium">Cliente</th>
                  <th className="px-4 py-3 font-medium">V. Interna</th>
                  <th className="px-4 py-3 font-medium">Loja</th>
                  <th className="px-4 py-3 font-medium">V. Parceira</th>
                  <th className="px-4 py-3 font-medium">Venda</th>
                  <th className="px-4 py-3 font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Boleta</th>
                  <th className="px-4 py-3 font-medium">Prod.</th>
                </tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(a.criado_em)}</td>
                    <td className="px-4 py-3 text-gray-600">{a.unidade?.nome}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.nome_cliente}</td>
                    <td className="px-4 py-3 text-gray-600">{a.vendedora_interna?.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{a.vendedora_parceira?.loja?.nome}</td>
                    <td className="px-4 py-3 text-gray-600">{a.vendedora_parceira?.nome}</td>
                    <td className="px-4 py-3">
                      {a.houve_venda ? (
                        <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">Sim</span>
                      ) : (
                        <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">Não</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.houve_venda ? formatCurrency(a.valor_venda) : '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.numero_boleta || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.qtd_produtos || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      {/* Tabela: Por Vendedora Interna */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Por Vendedora Interna</h3>
        </div>
        {porVendedoraInterna.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum dado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Vendedora</th>
                  <th className="px-4 py-3 font-medium text-right">Atend.</th>
                  <th className="px-4 py-3 font-medium text-right">Vendas</th>
                  <th className="px-4 py-3 font-medium text-right">Conversão</th>
                  <th className="px-4 py-3 font-medium text-right">Faturamento</th>
                  <th className="px-4 py-3 font-medium text-right">Ticket Médio</th>
                  <th className="px-4 py-3 font-medium text-right">Média Prod.</th>
                </tr>
              </thead>
              <tbody>
                {porVendedoraInterna.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.label}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.atendimentos}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.vendas}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.conversao}%</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.faturamento)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.ticketMedio)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.mediaProdutos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela: Por Vendedora Parceira */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Por Vendedora Parceira</h3>
        </div>
        {porVendedoraParceira.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum dado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Vendedora</th>
                  <th className="px-4 py-3 font-medium">Loja</th>
                  <th className="px-4 py-3 font-medium text-right">Atend.</th>
                  <th className="px-4 py-3 font-medium text-right">Vendas</th>
                  <th className="px-4 py-3 font-medium text-right">Conversão</th>
                  <th className="px-4 py-3 font-medium text-right">Faturamento</th>
                  <th className="px-4 py-3 font-medium text-right">Ticket Médio</th>
                  <th className="px-4 py-3 font-medium text-right">Média Prod.</th>
                </tr>
              </thead>
              <tbody>
                {porVendedoraParceira.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.label}</td>
                    <td className="px-4 py-3 text-gray-500">{r.extra}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.atendimentos}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.vendas}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.conversao}%</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.faturamento)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.ticketMedio)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.mediaProdutos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabela: Por Loja Parceira */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">Por Loja Parceira</h3>
        </div>
        {porLojaParceira.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum dado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-3 font-medium">Loja</th>
                  <th className="px-4 py-3 font-medium text-right">Atend.</th>
                  <th className="px-4 py-3 font-medium text-right">Vendas</th>
                  <th className="px-4 py-3 font-medium text-right">Conversão</th>
                  <th className="px-4 py-3 font-medium text-right">Faturamento</th>
                  <th className="px-4 py-3 font-medium text-right">Ticket Médio</th>
                  <th className="px-4 py-3 font-medium text-right">Média Prod.</th>
                </tr>
              </thead>
              <tbody>
                {porLojaParceira.map((r, i) => (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{r.label}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.atendimentos}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.vendas}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.conversao}%</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.faturamento)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{formatCurrency(r.ticketMedio)}</td>
                    <td className="px-4 py-3 text-gray-600 text-right">{r.mediaProdutos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
