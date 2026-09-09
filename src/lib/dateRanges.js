function startOfDay(date) {
  const result = new Date(date)
  result.setHours(0, 0, 0, 0)
  return result
}

function addDays(date, amount) {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const PERIOD_PRESETS = [
  { id: 'today', label: 'Hoje' },
  { id: 'this_week', label: 'Esta semana' },
  { id: 'last_week', label: 'Semana passada' },
  { id: 'this_month', label: 'Este mês' },
  { id: 'last_month', label: 'Mês passado' },
  { id: 'last_30', label: 'Últimos 30 dias' },
  { id: 'custom', label: 'Personalizado' },
]

export function getDateRange(preset = 'this_month', now = new Date(), custom = {}) {
  const today = startOfDay(now)
  let start
  let end

  if (preset === 'today') {
    start = today
    end = addDays(today, 1)
  } else if (preset === 'this_week' || preset === 'last_week') {
    const mondayOffset = (today.getDay() + 6) % 7
    start = addDays(today, -mondayOffset + (preset === 'last_week' ? -7 : 0))
    end = addDays(start, 7)
  } else if (preset === 'last_month') {
    start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
    end = new Date(today.getFullYear(), today.getMonth(), 1)
  } else if (preset === 'last_30') {
    start = addDays(today, -29)
    end = addDays(today, 1)
  } else if (preset === 'custom') {
    start = custom.start ? startOfDay(new Date(`${custom.start}T00:00:00`)) : today
    end = custom.end ? addDays(startOfDay(new Date(`${custom.end}T00:00:00`)), 1) : addDays(today, 1)
  } else {
    start = new Date(today.getFullYear(), today.getMonth(), 1)
    end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  }

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    startInput: toInputDate(start),
    endInput: toInputDate(addDays(end, -1)),
  }
}

export function formatRangeLabel(range) {
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
  const endInclusive = new Date(new Date(range.end).getTime() - 1)
  return `${formatter.format(new Date(range.start))} — ${formatter.format(endInclusive)}`
}
