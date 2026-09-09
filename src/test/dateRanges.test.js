import { describe, expect, it } from 'vitest'
import { getDateRange } from '../lib/dateRanges'

const now = new Date('2026-09-09T12:00:00-03:00')

describe('getDateRange', () => {
  it('usa limite final exclusivo para não perder registros no fim do dia', () => {
    const range = getDateRange('today', now)
    expect(new Date(range.end).getTime() - new Date(range.start).getTime()).toBe(24 * 60 * 60 * 1000)
  })

  it('calcula o mês anterior completo', () => {
    const range = getDateRange('last_month', now)
    expect(range.startInput).toBe('2026-08-01')
    expect(range.endInput).toBe('2026-08-31')
  })

  it('inclui as duas datas do período personalizado', () => {
    const range = getDateRange('custom', now, { start: '2026-09-02', end: '2026-09-04' })
    expect(range.startInput).toBe('2026-09-02')
    expect(range.endInput).toBe('2026-09-04')
  })
})
