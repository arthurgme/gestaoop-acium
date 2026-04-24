import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TabAtendimentos from '../pages/admin/TabAtendimentos'
import { mockQueryChain, setupFromMock } from './mocks/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase'

const AT_ATIVO = {
  id: 'at-admin-1',
  nome_cliente: 'Maria Oliveira',
  houve_venda: true,
  arquivado: false,
  criado_em: '2024-04-02T14:00:00Z',
  numero_boleta: 'ADM-001',
  valor_venda: 299.9,
  qtd_produtos: 2,
  unidade: { nome: 'Unidade Centro' },
  vendedora_interna: { nome: 'Carla' },
  vendedora_parceira: { nome: 'Bia', loja: { nome: 'Loja B' } },
}

const AT_ARQUIVADO = {
  id: 'at-admin-2',
  nome_cliente: 'Lucas Ferreira',
  houve_venda: false,
  arquivado: true,
  criado_em: '2024-03-20T11:00:00Z',
  numero_boleta: null,
  valor_venda: null,
  qtd_produtos: null,
  unidade: { nome: 'Unidade Norte' },
  vendedora_interna: { nome: 'Dani' },
  vendedora_parceira: { nome: 'Eve', loja: { nome: 'Loja C' } },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TabAtendimentos (Admin)', () => {
  it('renderiza sem erros', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], []),
    })
    render(<TabAtendimentos />)
    expect(screen.getByText('Atendimentos')).toBeInTheDocument()
  })

  it('exibe atendimentos ativos na tabela', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([AT_ATIVO], []),
    })
    render(<TabAtendimentos />)
    await screen.findByText('Maria Oliveira')
    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
    expect(screen.getByText('Unidade Centro')).toBeInTheDocument()
  })

  it('query de ativos usa .eq("arquivado", false)', async () => {
    const atChain = mockQueryChain([], [])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await waitFor(() => {
      expect(atChain.eq).toHaveBeenCalledWith('arquivado', false)
    })
  })

  it('query de arquivados usa .eq("arquivado", true)', async () => {
    const atChain = mockQueryChain([], [])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await waitFor(() => {
      expect(atChain.eq).toHaveBeenCalledWith('arquivado', true)
    })
  })

  it('botão Arquivar aparece em cada linha e chama update com { arquivado: true }', async () => {
    const atChain = mockQueryChain([AT_ATIVO], [])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await screen.findByText('Maria Oliveira')

    fireEvent.click(screen.getByRole('button', { name: /arquivar/i }))

    await waitFor(() => {
      expect(atChain.update).toHaveBeenCalledWith({ arquivado: true })
    })
    expect(atChain.eq).toHaveBeenCalledWith('id', 'at-admin-1')
  })

  it('seção Ver arquivados oculta por padrão', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], [AT_ARQUIVADO]),
    })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados/i)
    expect(screen.queryByText('Lucas Ferreira')).not.toBeInTheDocument()
  })

  it('toggle Ver arquivados mostra itens arquivados', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], [AT_ARQUIVADO]),
    })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados \(1\)/i)

    fireEvent.click(screen.getByText(/ver arquivados \(1\)/i))

    expect(await screen.findByText('Lucas Ferreira')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar/i })).toBeInTheDocument()
  })

  it('botão Restaurar chama update com { arquivado: false }', async () => {
    const atChain = mockQueryChain([], [AT_ARQUIVADO])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados/i)

    fireEvent.click(screen.getByText(/ver arquivados \(1\)/i))
    await screen.findByText('Lucas Ferreira')

    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }))

    await waitFor(() => {
      expect(atChain.update).toHaveBeenCalledWith({ arquivado: false })
    })
    expect(atChain.eq).toHaveBeenCalledWith('id', 'at-admin-2')
  })

  it('busca filtra por nome do cliente', async () => {
    const outro = { ...AT_ATIVO, id: 'at-3', nome_cliente: 'Roberto Alves' }
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([AT_ATIVO, outro], []),
    })
    render(<TabAtendimentos />)
    await screen.findByText('Maria Oliveira')

    const input = screen.getByPlaceholderText(/pesquisar/i)
    fireEvent.change(input, { target: { value: 'Maria' } })

    expect(screen.getByText('Maria Oliveira')).toBeInTheDocument()
    expect(screen.queryByText('Roberto Alves')).not.toBeInTheDocument()
  })
})
