import { PERIOD_PRESETS } from '../lib/dateRanges'

export default function PeriodFilter({ preset, onPresetChange, customStart, customEnd, onCustomChange }) {
  return (
    <div>
      <p className="filter-label">Período</p>
      <div className="period-pills" role="group" aria-label="Selecionar período">
        {PERIOD_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={preset === item.id}
            onClick={() => onPresetChange(item.id)}
            className={`period-pill ${preset === item.id ? 'period-pill-active' : ''}`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {preset === 'custom' && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
          <label className="field-label">
            Data inicial
            <input className="field-control mt-1" type="date" value={customStart} onChange={(event) => onCustomChange('start', event.target.value)} />
          </label>
          <label className="field-label">
            Data final
            <input className="field-control mt-1" type="date" value={customEnd} onChange={(event) => onCustomChange('end', event.target.value)} />
          </label>
        </div>
      )}
    </div>
  )
}
