import { describe, expect, it } from 'vitest'
import { aggregateDashboard } from '../lib/dashboardFallback'

function atendimento(index) {
  const houveVenda = index % 2 === 0
  return {
    id: String(index),
    unidade_id: 'unit-1',
    vendedora_interna_id: 'internal-1',
    vendedora_parceira_id: 'partner-1',
    houve_venda: houveVenda,
    valor_venda: houveVenda ? 100 : null,
    qtd_produtos: houveVenda ? 2 : null,
    unidade: { nome: 'ParkShopping' },
    vendedora_interna: { nome: 'Maria' },
    vendedora_parceira: { nome: 'Ana', loja: { id: 'store-1', nome: 'Loja A' } },
  }
}

describe('aggregateDashboard', () => {
  it('consolida corretamente mais de mil registros', () => {
    const metrics = aggregateDashboard(Array.from({ length: 1501 }, (_, index) => atendimento(index)))
    expect(metrics.resumo.atendimentos).toBe(1501)
    expect(metrics.resumo.vendas).toBe(751)
    expect(metrics.resumo.faturamento).toBe(75100)
    expect(metrics.por_unidade[0].atendimentos).toBe(1501)
    expect(metrics.por_loja[0].atendimentos).toBe(1501)
  })
})
