import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TabAtendimentos from '../pages/pdv/TabAtendimentos'
import { mockQueryChain, setupFromMock } from './mocks/supabase'

vi.mock('../lib/supabase', () => ({
  supabase: { from: vi.fn() },
}))

import { supabase } from '../lib/supabase'

const AT_ATIVO = {
  id: 'at-1',
  nome_cliente: 'João Silva',
  houve_venda: false,
  arquivado: false,
  criado_em: '2024-04-01T10:00:00Z',
  numero_boleta: 'BOL-001',
  valor_venda: null,
  qtd_produtos: null,
  vendedora_interna: { nome: 'Maria' },
  vendedora_parceira: { nome: 'Ana', loja: { nome: 'Loja A' } },
}

const AT_ARQUIVADO = {
  id: 'at-2',
  nome_cliente: 'Pedro Souza',
  houve_venda: false,
  arquivado: true,
  criado_em: '2024-03-15T09:00:00Z',
  numero_boleta: null,
  valor_venda: null,
  qtd_produtos: null,
  vendedora_interna: { nome: 'Maria' },
  vendedora_parceira: { nome: 'Ana', loja: { nome: 'Loja A' } },
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('TabAtendimentos (PDV)', () => {
  it('renderiza sem erros e exibe "Atendimentos"', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], []),
    })
    render(<TabAtendimentos />)
    expect(screen.getByText('Atendimentos')).toBeInTheDocument()
  })

  it('exibe dados de atendimento ativos na tabela', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([AT_ATIVO], []),
    })
    render(<TabAtendimentos />)
    await screen.findByText('João Silva')
    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.getByText('BOL-001')).toBeInTheDocument()
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

  it('busca filtra por nome do cliente', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([AT_ATIVO, { ...AT_ATIVO, id: 'at-9', nome_cliente: 'Carlos Lima' }], []),
    })
    render(<TabAtendimentos />)
    await screen.findByText('João Silva')

    const input = screen.getByPlaceholderText(/pesquisar/i)
    fireEvent.change(input, { target: { value: 'João' } })

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.queryByText('Carlos Lima')).not.toBeInTheDocument()
  })

  it('busca filtra por número de boleta', async () => {
    const semBoleta = { ...AT_ATIVO, id: 'at-3', nome_cliente: 'Carlos', numero_boleta: 'XYZ-999' }
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([AT_ATIVO, semBoleta], []),
    })
    render(<TabAtendimentos />)
    await screen.findByText('João Silva')

    const input = screen.getByPlaceholderText(/pesquisar/i)
    fireEvent.change(input, { target: { value: 'BOL-001' } })

    expect(screen.getByText('João Silva')).toBeInTheDocument()
    expect(screen.queryByText('Carlos')).not.toBeInTheDocument()
  })

  it('botão Arquivar chama update com { arquivado: true }', async () => {
    const atChain = mockQueryChain([AT_ATIVO], [])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await screen.findByText('João Silva')

    fireEvent.click(screen.getByRole('button', { name: /arquivar/i }))

    await waitFor(() => {
      expect(atChain.update).toHaveBeenCalledWith({ arquivado: true })
    })
    expect(atChain.eq).toHaveBeenCalledWith('id', 'at-1')
  })

  it('seção Ver arquivados fica oculta por padrão', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], [AT_ARQUIVADO]),
    })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados/i)

    expect(screen.queryByText('Pedro Souza')).not.toBeInTheDocument()
  })

  it('botão Ver arquivados revela os itens arquivados', async () => {
    setupFromMock(supabase, {
      atendimentos: mockQueryChain([], [AT_ARQUIVADO]),
    })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados \(1\)/i)

    fireEvent.click(screen.getByText(/ver arquivados \(1\)/i))

    expect(await screen.findByText('Pedro Souza')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /restaurar/i })).toBeInTheDocument()
  })

  it('botão Restaurar chama update com { arquivado: false }', async () => {
    const atChain = mockQueryChain([], [AT_ARQUIVADO])
    setupFromMock(supabase, { atendimentos: atChain })
    render(<TabAtendimentos />)
    await screen.findByText(/ver arquivados/i)

    fireEvent.click(screen.getByText(/ver arquivados \(1\)/i))
    await screen.findByText('Pedro Souza')

    fireEvent.click(screen.getByRole('button', { name: /restaurar/i }))

    await waitFor(() => {
      expect(atChain.update).toHaveBeenCalledWith({ arquivado: false })
    })
    expect(atChain.eq).toHaveBeenCalledWith('id', 'at-2')
  })

  it('colunas corretas são exibidas no cabeçalho', async () => {
    setupFromMock(supabase, { atendimentos: mockQueryChain([AT_ATIVO], []) })
    render(<TabAtendimentos />)
    await waitFor(() => {
      expect(screen.getByText('Data')).toBeInTheDocument()
      expect(screen.getByText('Cliente')).toBeInTheDocument()
      expect(screen.getByText('V. Interna')).toBeInTheDocument()
      expect(screen.getByText('Loja')).toBeInTheDocument()
      expect(screen.getByText('V. Parceira')).toBeInTheDocument()
      expect(screen.getByText('Venda')).toBeInTheDocument()
      expect(screen.getByText('Valor')).toBeInTheDocument()
      expect(screen.getByText('Boleta')).toBeInTheDocument()
      expect(screen.getByText('Prod.')).toBeInTheDocument()
      expect(screen.getByText('Ações')).toBeInTheDocument()
    })
  })
})
