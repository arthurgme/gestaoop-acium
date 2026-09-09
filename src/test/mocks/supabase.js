import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query mock.
 * Cycles through dataResponses in order, wrapping around after the last one.
 * This handles components that fetch multiple times (e.g. due to useCallback deps).
 *
 * Example: mockQueryChain([activeItems], [archivedItems])
 *   - odd calls  (0, 2, 4…) return activeItems
 *   - even calls (1, 3, 5…) return archivedItems
 */
export function mockQueryChain(...dataResponses) {
  if (dataResponses.length === 0) dataResponses = [[]]
  let callCount = 0

  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    in: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => chain),
    update: vi.fn(() => chain),
    single: vi.fn(() => chain),
    _next: () => {
      const data = dataResponses[callCount % dataResponses.length]
      callCount++
      return data
    },
    then: (resolve, reject) => {
      return Promise.resolve({ data: chain._next(), error: null }).then(resolve, reject)
    },
  }

  return chain
}

/**
 * Sets up supabase.from to return specific chains per table.
 * Tables not listed in tableMap return an empty-array chain.
 */
export function setupFromMock(supabase, tableMap) {
  const emptyChain = mockQueryChain([])
  supabase.from.mockImplementation((table) => tableMap[table] ?? emptyChain)
  if (!supabase.rpc) supabase.rpc = vi.fn()
  const attendanceChain = tableMap.atendimentos
  supabase.rpc.mockImplementation((name, args = {}) => {
    if (name !== 'listar_atendimentos' || !attendanceChain) return Promise.resolve({ data: null, error: null })
    attendanceChain.eq('arquivado', args.p_arquivado)
    let items = attendanceChain._next() || []
    const search = String(args.p_busca || '').toLowerCase()
    if (search) items = items.filter((item) => item.nome_cliente?.toLowerCase().includes(search) || item.numero_boleta?.toLowerCase().includes(search))
    items = items.map((item) => ({
      ...item,
      unidade_nome: item.unidade_nome || item.unidade?.nome,
      vendedora_interna_nome: item.vendedora_interna_nome || item.vendedora_interna?.nome,
      vendedora_parceira_nome: item.vendedora_parceira_nome || item.vendedora_parceira?.nome,
      loja_nome: item.loja_nome || item.vendedora_parceira?.loja?.nome,
    }))
    return Promise.resolve({ data: { total: items.length, pagina: 1, por_pagina: 50, itens: items }, error: null })
  })
}
