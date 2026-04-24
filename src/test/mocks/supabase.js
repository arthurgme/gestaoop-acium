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
    then: (resolve, reject) => {
      const data = dataResponses[callCount % dataResponses.length]
      callCount++
      return Promise.resolve({ data, error: null }).then(resolve, reject)
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
}
