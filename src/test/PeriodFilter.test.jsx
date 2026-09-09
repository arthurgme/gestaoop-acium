import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import PeriodFilter from '../components/PeriodFilter'

function PeriodFilterHarness() {
  const [preset, setPreset] = useState('this_month')
  const [custom, setCustom] = useState({ start: '', end: '' })

  return (
    <PeriodFilter
      preset={preset}
      onPresetChange={setPreset}
      customStart={custom.start}
      customEnd={custom.end}
      onCustomChange={(key, value) => setCustom((current) => ({ ...current, [key]: value }))}
    />
  )
}

describe('PeriodFilter', () => {
  it('mantém as datas recolhidas até selecionar um período personalizado', () => {
    render(<PeriodFilterHarness />)

    expect(screen.getByLabelText('Período')).toHaveValue('this_month')
    expect(screen.queryByLabelText('Data inicial')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Período'), { target: { value: 'custom' } })

    expect(screen.getByLabelText('Data inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Data final')).toBeInTheDocument()
  })
})
