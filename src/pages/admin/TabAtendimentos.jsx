import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { formatCurrency, formatDateTime } from '../../lib/format'

export default function TabAtendimentos() {
  const [unidades, setUnidades] = useState([])
  const [lojasParceiras, setLojasParceiras] = useState([])
  const [vendedorasParceiras, setVendedorasParceiras] = useState([])
  const [vendedorasInternas, setVendedorasInternas] = useState([])
  const [atendimentos, setAtendimentos] = useState([])
  const [loading, setLoading] = useState(false)

  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroDe, setFiltroDe] = useState('')
  const [filtroAte, setFiltroAte] = useState('')
  const [filtroLoja, setFiltroLoja] = useState('')
  const [filtroVendedoraParceira, setFiltroVendedoraParceira] = useState('')
  const [filtroVendedoraInterna, setFiltroVendedoraInterna] = useState('')
  const [busca, setBusca] = useState('')

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

  const fetchAtendimentos = useCallback(async () => {
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
      .limit(500)

    if (filtroUnidade) query = query.eq('unidade_id', filtroUnidade)
    if (filtroDe) query = query.gte('criado_em', new Date(`${filtroDe}T00:00:00`).toISOString())
    if (filtroAte) query = query.lte('criado_em', new Date(`${filtroAte}T23:59:59.999`).toISOString())
    if (filtroLoja) {
      const vpIds = vendedorasParceiras.filter((v) => v.loja_parceira_id === filtroLoja).map((v) => v.id)
      if (vpIds.length > 0) {
        query = query.in('vendedora_parceira_id', vpIds)
      } else {
        setAtendimentos([])
        setLoading(false)
        return
      }
    }
    if (filtroVendedoraParceira) query = query.eq('vendedora_parceira_id', filtroVendedoraParceira)
    if (filtroVendedoraInterna) query = query.eq('vendedora_interna_id', filtroVendedoraInterna)

    const { data } = await query
    setAtendimentos(data || [])
    setLoading(false)
  }, [filtroUnidade, filtroDe, filtroAte, filtroLoja, filtroVendedoraParceira, filtroVendedoraInterna, vendedorasParceiras])

  useEffect(() => {
    fetchAtendimentos()
  }, [fetchAtendimentos])

  const buscaNorm = busca.trim().toLowerCase()
  const itensFiltrados = buscaNorm
    ? atendimentos.filter(
        (a) =>
          a.nome_cliente?.toLowerCase().includes(buscaNorm) ||
          a.numero_boleta?.toLowerCase().includes(buscaNorm),
      )
    : atendimentos

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

  function limparFiltros() {
    setFiltroUnidade('')
    setFiltroDe('')
    setFiltroAte('')
    setFiltroLoja('')
    setFiltroVendedoraParceira('')
    setFiltroVendedoraInterna('')
    setBusca('')
  }

  const temFiltro =
    filtroUnidade || filtroDe || filtroAte || filtroLoja || filtroVendedoraParceira || filtroVendedoraInterna || busca

  return (
    <div className="space-y-5">
      {/* Filtros */}
      <div className="bg-white rounded-xl shadow p-4 space-y-3">
        {/* Pesquisa */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Pesquisar por nome do cliente ou boleta..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
          />
        </div>

        {/* Filtros de dropdown/data */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Unidade</label>
            <select value={filtroUnidade} onChange={(e) => { setFiltroUnidade(e.target.value); setFiltroLoja(''); setFiltroVendedoraParceira('') }}
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
            <select value={filtroLoja} onChange={(e) => { setFiltroLoja(e.target.value); setFiltroVendedoraParceira('') }}
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

        {temFiltro && (
          <div className="flex justify-end">
            <button onClick={limparFiltros}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium cursor-pointer">
              Limpar filtros
            </button>
          </div>
        )}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-800">Atendimentos</h3>
            {!loading && (
              <p className="text-xs text-gray-400 mt-0.5">{itensFiltrados.length} registro(s)</p>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          </div>
        ) : itensFiltrados.length === 0 ? (
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
                {itensFiltrados.map((a) => (
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
    </div>
  )
}
