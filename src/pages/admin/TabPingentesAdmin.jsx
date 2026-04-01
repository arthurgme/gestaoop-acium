import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../lib/format'

export default function TabPingentesAdmin() {
  const { profile } = useAuth()
  const [unidades, setUnidades] = useState([])
  const [movimentacoes, setMovimentacoes] = useState([])
  const [filtroUnidade, setFiltroUnidade] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [showHistorico, setShowHistorico] = useState(true)

  // Ajuste modal
  const [ajusteUnidade, setAjusteUnidade] = useState(null)
  const [novoSaldo, setNovoSaldo] = useState('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroAjuste, setErroAjuste] = useState('')

  const loadUnidades = useCallback(async () => {
    const { data } = await supabase.from('unidades').select('*').eq('ativa', true).order('nome')
    setUnidades(data || [])
  }, [])

  const loadMovimentacoes = useCallback(async () => {
    let query = supabase
      .from('movimentacoes_pingentes')
      .select('*, unidade:unidades(nome), realizado:profiles(nome)')
      .order('criado_em', { ascending: false })
      .limit(100)
    if (filtroUnidade) query = query.eq('unidade_id', filtroUnidade)
    if (filtroTipo) query = query.eq('tipo', filtroTipo)
    const { data } = await query
    setMovimentacoes(data || [])
  }, [filtroUnidade, filtroTipo])

  useEffect(() => { loadUnidades() }, [loadUnidades])
  useEffect(() => { loadMovimentacoes() }, [loadMovimentacoes])

  async function handleAjuste(e) {
    e.preventDefault()
    if (!observacao.trim()) { setErroAjuste('Observação é obrigatória para ajuste manual.'); return }
    setErroAjuste('')
    setLoading(true)
    const { error } = await supabase.rpc('ajuste_manual_pingentes', {
      p_unidade_id: ajusteUnidade.id,
      p_novo_saldo: parseInt(novoSaldo),
      p_observacao: observacao,
      p_realizado_por: profile.id,
    })
    if (error) {
      setErroAjuste('Erro: ' + error.message)
    } else {
      setAjusteUnidade(null)
      setNovoSaldo('')
      setObservacao('')
      loadUnidades()
      loadMovimentacoes()
    }
    setLoading(false)
  }

  const tipoLabel = { entrada: 'Entrada', saida: 'Saída', ajuste: 'Ajuste' }
  const tipoColor = {
    entrada: 'text-green-700 bg-green-100',
    saida: 'text-red-700 bg-red-100',
    ajuste: 'text-blue-700 bg-blue-100',
  }

  return (
    <div className="space-y-6">
      {/* Saldo cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {unidades.map((u) => (
          <div key={u.id} className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{u.nome}</p>
                <p className="text-3xl font-bold text-amber-700 mt-1">{u.saldo_pingentes}</p>
                <p className="text-xs text-gray-400">pingentes</p>
              </div>
              <button
                onClick={() => { setAjusteUnidade(u); setNovoSaldo(String(u.saldo_pingentes)) }}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
              >
                Ajustar
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Ajuste modal */}
      {ajusteUnidade && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Ajuste Manual — {ajusteUnidade.nome}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Saldo atual: <strong>{ajusteUnidade.saldo_pingentes}</strong>
            </p>
            <form onSubmit={handleAjuste} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Novo saldo</label>
                <input
                  type="number"
                  min="0"
                  value={novoSaldo}
                  onChange={(e) => setNovoSaldo(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Observação *</label>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Motivo do ajuste..."
                />
              </div>
              {erroAjuste && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erroAjuste}</p>}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-amber-600 text-white py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 cursor-pointer"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => { setAjusteUnidade(null); setNovoSaldo(''); setObservacao(''); setErroAjuste('') }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-200 cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filters + History */}
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setShowHistorico((o) => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <div>
            <h3 className="font-semibold text-gray-800">Histórico de Movimentações</h3>
            <p className="text-xs text-gray-400 mt-0.5">{movimentacoes.length} registro{movimentacoes.length !== 1 ? 's' : ''}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showHistorico ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showHistorico && (
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-3">
          <select value={filtroUnidade} onChange={(e) => setFiltroUnidade(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
            <option value="">Todas unidades</option>
            {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
          </select>
          <select value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none">
            <option value="">Todos tipos</option>
            <option value="entrada">Entrada</option>
            <option value="saida">Saída</option>
            <option value="ajuste">Ajuste</option>
          </select>
        </div>
        )}
        {showHistorico && (movimentacoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma movimentação.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Unidade</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Qtd</th>
                  <th className="px-6 py-3 font-medium">Observação</th>
                  <th className="px-6 py-3 font-medium">Realizado por</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600 whitespace-nowrap">{formatDateTime(m.criado_em)}</td>
                    <td className="px-6 py-3 text-gray-600">{m.unidade?.nome}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipoColor[m.tipo]}`}>
                        {tipoLabel[m.tipo]}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">{m.quantidade}</td>
                    <td className="px-6 py-3 text-gray-500">{m.observacao || '—'}</td>
                    <td className="px-6 py-3 text-gray-600">{m.realizado?.nome || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
