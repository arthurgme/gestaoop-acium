import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ranking } from '../components/AnalyticsDashboard'

const rows = [
  { id: '1', nome: 'Loja B', atendimentos: 10, vendas: 4, conversao: 40, faturamento: 800, ticket_medio: 200 },
  { id: '2', nome: 'Loja A', atendimentos: 30, vendas: 6, conversao: 20, faturamento: 600, ticket_medio: 100 },
  { id: '3', nome: 'Loja C', atendimentos: 20, vendas: 10, conversao: 50, faturamento: 1500, ticket_medio: 150 },
]

function renderedNames() {
  return screen.getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('cell')[0].textContent)
}

describe('Ranking', () => {
  it('alterna entre decrescente, crescente e ordem padrão', () => {
    render(<Ranking title="Lojas" subtitle="Desempenho" rows={rows} firstColumn="Loja" />)
    const atendimentos = screen.getByRole('button', { name: /ordenar atendimentos/i })

    fireEvent.click(atendimentos)
    expect(renderedNames()).toEqual(['Loja A', 'Loja C', 'Loja B'])
    expect(atendimentos.closest('th')).toHaveAttribute('aria-sort', 'descending')

    fireEvent.click(atendimentos)
    expect(renderedNames()).toEqual(['Loja B', 'Loja C', 'Loja A'])
    expect(atendimentos.closest('th')).toHaveAttribute('aria-sort', 'ascending')

    fireEvent.click(atendimentos)
    expect(renderedNames()).toEqual(['Loja B', 'Loja A', 'Loja C'])
    expect(atendimentos.closest('th')).toHaveAttribute('aria-sort', 'none')
  })
})
