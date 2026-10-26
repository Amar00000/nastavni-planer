import type { ScheduleEntry } from '../core/types'
import { WEEKDAY_NAMES } from '../core/project'

interface Props {
  schedule: ScheduleEntry[]
  onChange: (schedule: ScheduleEntry[]) => void
}

export function ScheduleEditor({ schedule, onChange }: Props) {
  const setHours = (weekday: number, raw: string) => {
    const parsed = parseInt(raw, 10)
    const hours = Number.isNaN(parsed) ? 0 : Math.min(Math.max(parsed, 0), 8)
    onChange(schedule.map((e) => (e.weekday === weekday ? { ...e, hours } : e)))
  }

  return (
    <section className="panel">
      <h2>Sedmični raspored</h2>
      <p className="hint">Upišite broj časova za svaki dan u kojem se održava nastava. Ostavite 0 za dane bez nastave.</p>
      {schedule.map((entry) => (
        <label key={entry.weekday} className="field field-inline">
          <span>{WEEKDAY_NAMES[entry.weekday - 1]}</span>
          <input
            type="number"
            min={0}
            max={8}
            value={entry.hours}
            onChange={(e) => setHours(entry.weekday, e.target.value)}
          />
        </label>
      ))}
    </section>
  )
}
