import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatDateTime } from '../../lib/format'

export default function TabPingentes() {
  const { profile } = useAuth()
  const unidadeId = profile?.unidade_id

  const [saldo, setSaldo] = useState(0)
  const [movimentacoes, setMovimentacoes] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showHistorico, setShowHistorico] = useState(true)
  const [erro, setErro] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    if (!unidadeId) return
    const [unidadeRes, movRes] = await Promise.all([
      supabase.from('unidades').select('saldo_pingentes').eq('id', unidadeId).single(),
      supabase
        .from('movimentacoes_pingentes')
        .select('*, realizado:profiles(nome)')
        .eq('unidade_id', unidadeId)
        .order('criado_em', { ascending: false })
        .limit(50),
    ])
    setSaldo(unidadeRes.data?.saldo_pingentes || 0)
    setMovimentacoes(movRes.data || [])
  }, [unidadeId])

  useEffect(() => { load() }, [load])

  async function handleEntrada(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.rpc('registrar_entrada_pingentes', {
      p_unidade_id: unidadeId,
      p_quantidade: parseInt(quantidade),
      p_realizado_por: profile.id,
    })
    if (error) {
      setErro('Erro: ' + error.message)
    } else {
      setErro('')
      setQuantidade('')
      setShowForm(false)
      load()
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
      <div className="bg-amber-600 text-white rounded-xl p-8 text-center">
        <p className="text-sm font-medium opacity-80">Saldo Atual de Pingentes</p>
        <p className="text-5xl font-bold mt-2">{saldo}</p>
      </div>

      <div className="flex gap-3">
        {!showForm ? (
          <button
            onClick={() => setShowForm(true)}
            className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors cursor-pointer"
          >
            + Registrar Entrada
          </button>
        ) : (
          <form onSubmit={handleEntrada} className="flex items-end gap-3 bg-white rounded-xl shadow p-4 w-full sm:w-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantidade</label>
              <input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                required
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none w-32"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setQuantidade(''); setErro('') }}
              className="text-gray-400 hover:text-gray-600 px-3 py-2 cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}
      </div>
      {erro && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{erro}</p>}

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
        {showHistorico && (movimentacoes.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma movimentação registrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Data</th>
                  <th className="px-6 py-3 font-medium">Tipo</th>
                  <th className="px-6 py-3 font-medium">Quantidade</th>
                  <th className="px-6 py-3 font-medium">Observação</th>
                  <th className="px-6 py-3 font-medium">Realizado por</th>
                </tr>
              </thead>
              <tbody>
                {movimentacoes.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">{formatDateTime(m.criado_em)}</td>
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
