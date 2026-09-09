import { PERIOD_PRESETS } from '../lib/dateRanges'

export default function PeriodFilter({ preset, onPresetChange, customStart, customEnd, onCustomChange }) {
  return (
    <div className={preset === 'custom' ? 'sm:col-span-2 lg:col-span-2' : ''}>
      <label className="field-label">
        Período
        <select className="field-control mt-1" value={preset} onChange={(event) => onPresetChange(event.target.value)}>
          {PERIOD_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      {preset === 'custom' && (
        <div className="mt-2 grid grid-cols-2 gap-2">
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
