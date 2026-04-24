import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { formatCurrency, monthRange } from '../../lib/format'

export default function TabResultados() {
  const { profile } = useAuth()
  const unidadeId = profile?.unidade_id
  const [metrics, setMetrics] = useState(null)

  useEffect(() => {
    if (!unidadeId) return
    const { start, end } = monthRange()

    supabase
      .from('atendimentos')
      .select('*')
      .eq('unidade_id', unidadeId)
      .eq('arquivado', false)
      .gte('criado_em', start)
      .lte('criado_em', end)
      .then(({ data }) => {
        const items = data || []
        const totalAtendimentos = items.length
        const vendas = items.filter((a) => a.houve_venda)
        const totalVendas = vendas.length
        const taxaConversao = totalAtendimentos > 0 ? ((totalVendas / totalAtendimentos) * 100).toFixed(1) : '0.0'
        const faturamento = vendas.reduce((sum, a) => sum + (parseFloat(a.valor_venda) || 0), 0)
        const totalProdutos = vendas.reduce((sum, a) => sum + (a.qtd_produtos || 0), 0)
        const mediaProdutos = totalVendas > 0 ? (totalProdutos / totalVendas).toFixed(1) : '0.0'

        setMetrics({ totalAtendimentos, totalVendas, taxaConversao, faturamento, mediaProdutos })
      })
  }, [unidadeId])

  if (!metrics) {
    return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" /></div>
  }

  const cards = [
    { label: 'Total de Atendimentos', value: metrics.totalAtendimentos, color: 'bg-blue-50 text-blue-700' },
    { label: 'Total de Vendas', value: metrics.totalVendas, color: 'bg-green-50 text-green-700' },
    { label: 'Taxa de Conversão', value: `${metrics.taxaConversao}%`, color: 'bg-purple-50 text-purple-700' },
    { label: 'Faturamento Total', value: formatCurrency(metrics.faturamento), color: 'bg-amber-50 text-amber-700' },
    { label: 'Média Produtos/Venda', value: metrics.mediaProdutos, color: 'bg-indigo-50 text-indigo-700' },
  ]

  const now = new Date()
  const mesAtual = now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-1">Resultados — {mesAtual}</h2>
      <p className="text-sm text-gray-500 mb-6">Métricas da unidade no mês atual</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`rounded-xl p-6 ${c.color}`}>
            <p className="text-sm font-medium opacity-75">{c.label}</p>
            <p className="text-3xl font-bold mt-1">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
