import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, formatDateTime, todayRange } from '../../lib/format'

export default function TabLancamento() {
  const { profile } = useAuth()
  const unidadeId = profile?.unidade_id

  const [atendimentos, setAtendimentos] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [showHistorico, setShowHistorico] = useState(true)
  const [vendedorasInternas, setVendedorasInternas] = useState([])
  const [lojasParceiras, setLojasParceiras] = useState([])
  const [vendedorasParceiras, setVendedorasParceiras] = useState([])
  const [loading, setLoading] = useState(false)
  const [erro, setErro] = useState('')

  // Form state
  const [nomeCliente, setNomeCliente] = useState('')
  const [vendedoraInternaId, setVendedoraInternaId] = useState('')
  const [lojaParceiraId, setLojaParceiraId] = useState('')
  const [vendedoraParceiraId, setVendedoraParceiraId] = useState('')
  const [houveVenda, setHouveVenda] = useState(false)
  const [valorVenda, setValorVenda] = useState('')
  const [numeroBoleta, setNumeroBoleta] = useState('')
  const [qtdProdutos, setQtdProdutos] = useState('')
  const [step, setStep] = useState(1) // 1 = select vendedora, 2 = form

  const loadAtendimentos = useCallback(async () => {
    const { start, end } = todayRange()
    const { data } = await supabase
      .from('atendimentos')
      .select(`
        *,
        vendedora_interna:vendedoras_internas(nome),
        vendedora_parceira:vendedoras_parceiras(nome, loja:lojas_parceiras(nome))
      `)
      .eq('unidade_id', unidadeId)
      .gte('criado_em', start)
      .lte('criado_em', end)
      .order('criado_em', { ascending: false })
    setAtendimentos(data || [])
  }, [unidadeId])

  const loadSelects = useCallback(async () => {
    const [viRes, lpRes] = await Promise.all([
      supabase.from('vendedoras_internas').select('*').eq('unidade_id', unidadeId).eq('ativa', true).order('nome'),
      supabase.from('lojas_parceiras').select('*').eq('unidade_id', unidadeId).eq('ativa', true).order('nome'),
    ])
    setVendedorasInternas(viRes.data || [])
    setLojasParceiras(lpRes.data || [])
  }, [unidadeId])

  useEffect(() => {
    if (unidadeId) {
      loadAtendimentos()
      loadSelects()
    }
  }, [unidadeId, loadAtendimentos, loadSelects])

  useEffect(() => {
    if (lojaParceiraId) {
      supabase
        .from('vendedoras_parceiras')
        .select('*')
        .eq('loja_parceira_id', lojaParceiraId)
        .eq('ativa', true)
        .order('nome')
        .then(({ data }) => setVendedorasParceiras(data || []))
    } else {
      setVendedorasParceiras([])
      setVendedoraParceiraId('')
    }
  }, [lojaParceiraId])

  function resetForm() {
    setNomeCliente('')
    setVendedoraInternaId('')
    setLojaParceiraId('')
    setVendedoraParceiraId('')
    setHouveVenda(false)
    setValorVenda('')
    setNumeroBoleta('')
    setQtdProdutos('')
    setStep(1)
    setShowForm(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.from('atendimentos').insert({
      nome_cliente: nomeCliente,
      unidade_id: unidadeId,
      vendedora_interna_id: vendedoraInternaId,
      vendedora_parceira_id: vendedoraParceiraId,
      houve_venda: houveVenda,
      valor_venda: houveVenda ? parseFloat(valorVenda) : null,
      numero_boleta: houveVenda ? numeroBoleta : null,
      qtd_produtos: houveVenda ? parseInt(qtdProdutos) : null,
    })
    if (error) {
      setErro('Erro ao registrar atendimento: ' + error.message)
    } else {
      setErro('')
      resetForm()
      loadAtendimentos()
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {!showForm ? (
        <button
          onClick={() => setShowForm(true)}
          className="bg-amber-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-amber-700 transition-colors cursor-pointer"
        >
          + Novo Atendimento
        </button>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Novo Atendimento</h2>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 cursor-pointer">
              Cancelar
            </button>
          </div>

          {step === 1 ? (
            <div>
              <p className="text-sm text-gray-600 mb-4">Selecione a vendedora que realizou o atendimento:</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {vendedorasInternas.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVendedoraInternaId(v.id)
                      setStep(2)
                    }}
                    className={`p-4 rounded-xl border-2 text-center transition-all cursor-pointer ${
                      vendedoraInternaId === v.id
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-amber-300'
                    }`}
                  >
                    <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-amber-700 font-bold text-lg">
                        {v.nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm font-medium text-gray-700">{v.nome}</span>
                  </button>
                ))}
              </div>
              {vendedorasInternas.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-8">
                  Nenhuma vendedora interna cadastrada. Vá em Configurações para adicionar.
                </p>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="bg-amber-50 px-3 py-2 rounded-lg text-sm text-amber-800">
                Vendedora: <strong>{vendedorasInternas.find((v) => v.id === vendedoraInternaId)?.nome}</strong>
                <button type="button" onClick={() => setStep(1)} className="ml-2 text-amber-600 underline cursor-pointer">
                  alterar
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do cliente</label>
                <input
                  type="text"
                  value={nomeCliente}
                  onChange={(e) => setNomeCliente(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Loja parceira</label>
                  <select
                    value={lojaParceiraId}
                    onChange={(e) => setLojaParceiraId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  >
                    <option value="">Selecione...</option>
                    {lojasParceiras.map((l) => (
                      <option key={l.id} value={l.id}>{l.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vendedora parceira</label>
                  <select
                    value={vendedoraParceiraId}
                    onChange={(e) => setVendedoraParceiraId(e.target.value)}
                    required
                    disabled={!lojaParceiraId}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none disabled:bg-gray-100"
                  >
                    <option value="">Selecione...</option>
                    {vendedorasParceiras.map((v) => (
                      <option key={v.id} value={v.id}>{v.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <label className="text-sm font-medium text-gray-700">Houve venda?</label>
                <button
                  type="button"
                  onClick={() => setHouveVenda(!houveVenda)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    houveVenda ? 'bg-amber-600' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      houveVenda ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {houveVenda && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-green-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Valor da venda (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={valorVenda}
                      onChange={(e) => setValorVenda(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nº da boleta</label>
                    <input
                      type="text"
                      value={numeroBoleta}
                      onChange={(e) => setNumeroBoleta(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Qtd. produtos</label>
                    <input
                      type="number"
                      min="1"
                      value={qtdProdutos}
                      onChange={(e) => setQtdProdutos(e.target.value)}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                  </div>
                </div>
              )}

              {erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-amber-600 text-white py-2.5 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {loading ? 'Registrando...' : 'Confirmar Atendimento'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* Atendimentos do dia */}
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setShowHistorico((o) => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <div>
            <h3 className="font-semibold text-gray-800">Atendimentos de Hoje</h3>
            <p className="text-xs text-gray-400 mt-0.5">{atendimentos.length} registrado{atendimentos.length !== 1 ? 's' : ''}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showHistorico ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showHistorico && (atendimentos.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum atendimento registrado hoje.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Hora</th>
                  <th className="px-6 py-3 font-medium">Cliente</th>
                  <th className="px-6 py-3 font-medium">Vendedora</th>
                  <th className="px-6 py-3 font-medium">Loja / Parceira</th>
                  <th className="px-6 py-3 font-medium">Venda</th>
                  <th className="px-6 py-3 font-medium">Valor</th>
                </tr>
              </thead>
              <tbody>
                {atendimentos.map((a) => (
                  <tr key={a.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-600">
                      {new Date(a.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3 font-medium text-gray-800">{a.nome_cliente}</td>
                    <td className="px-6 py-3 text-gray-600">{a.vendedora_interna?.nome}</td>
                    <td className="px-6 py-3 text-gray-600">
                      {a.vendedora_parceira?.loja?.nome} / {a.vendedora_parceira?.nome}
                    </td>
                    <td className="px-6 py-3">
                      {a.houve_venda ? (
                        <span className="text-green-700 bg-green-100 px-2 py-0.5 rounded-full text-xs font-medium">Sim</span>
                      ) : (
                        <span className="text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full text-xs font-medium">Não</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-600">{a.houve_venda ? formatCurrency(a.valor_venda) : '—'}</td>
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
