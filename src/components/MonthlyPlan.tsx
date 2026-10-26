import { useState } from 'react'
import type { MonthPlan, YearPlan } from '../core/types'
import { themeFor } from '../core/plan'
import { weekKey } from '../core/project'
import { AutoTextarea } from './AutoTextarea'
import type { WeekNote } from '../core/project'

interface Props {
  plan: YearPlan
  themes: string[]
  weekNotes: Record<string, WeekNote>
  onNoteChange: (key: string, field: keyof WeekNote, value: string) => void
  onExport: (month: MonthPlan) => void
}

const monthId = (m: MonthPlan) => `${m.year}-${m.month}`

export function MonthlyPlan({ plan, themes, weekNotes, onNoteChange, onExport }: Props) {
  const [selectedId, setSelectedId] = useState('')

  if (plan.total === 0) {
    return (
      <section className="panel">
        <h2>Mjesečni planovi</h2>
        <p className="hint">Unesite sedmični raspored da bi se prikazali mjesečni planovi.</p>
      </section>
    )
  }

  // If the selected month no longer exists (schedule or calendar changed), fall back to the first.
  const month = plan.months.find((m) => monthId(m) === selectedId) ?? plan.months[0]

  return (
    <section className="panel">
      <h2>Mjesečni planovi</h2>

      <div className="month-picker" role="group" aria-label="Mjesec">
        {plan.months.map((m) => (
          <button
            key={monthId(m)}
            type="button"
            className={m === month ? 'selected' : ''}
            aria-pressed={m === month}
            onClick={() => setSelectedId(monthId(m))}
          >
            {m.name}
          </button>
        ))}
      </div>

      <div className="month-head">
        <h3 className="month-title">
          {month.name} {month.year}.
          <span className="count">Planirano časova: {month.total}</span>
        </h3>
        <button type="button" className="primary" onClick={() => onExport(month)}>
          Preuzmi Word dokument
        </button>
      </div>
      <p className="hint">
        Tematske jedinice se preuzimaju iz godišnjeg plana i ovdje se ne mogu mijenjati.
      </p>

      <div className="table-scroll">
        <table className="monthly">
          <thead>
            <tr>
              <th>Sedmica</th>
              <th>Broj časova</th>
              <th>Nastavna tema</th>
              <th>Tematska jedinica</th>
              <th>Ciljevi i zadaci</th>
              <th>Očekivani rezultati</th>
            </tr>
          </thead>
          <tbody>
            {month.weeks.map((week) => {
              const key = weekKey(month, week)
              const note = weekNotes[key] ?? { topic: '', goals: '', outcomes: '' }
              const empty = week.lessons.length === 0
              return (
                <tr key={key} className={empty ? 'no-lessons' : ''}>
                  <td>{week.label}</td>
                  <td className="num">{week.lessons.length}</td>
                  <td className="edit-cell">
                    <AutoTextarea
                      aria-label={`Nastavna tema, ${month.name}, ${week.label}`}
                      value={note.topic}
                      disabled={empty}
                      onChange={(e) => onNoteChange(key, 'topic', e.target.value)}
                    />
                  </td>
                  <td>
                    {empty ? (
                      <span className="muted">Nema časova</span>
                    ) : (
                      <ol className="units">
                        {week.lessons.map((lesson, i) => {
                          const theme = themeFor(themes, lesson)
                          return (
                            <li key={lesson.index}>
                              <span className="lesson-no">{i + 1}.</span>
                              {theme.trim() ? theme : <span className="muted">tema nije unesena</span>}
                            </li>
                          )
                        })}
                      </ol>
                    )}
                  </td>
                  <td className="edit-cell">
                    <AutoTextarea
                      aria-label={`Ciljevi i zadaci, ${month.name}, ${week.label}`}
                      value={note.goals}
                      disabled={empty}
                      onChange={(e) => onNoteChange(key, 'goals', e.target.value)}
                    />
                  </td>
                  <td className="edit-cell">
                    <AutoTextarea
                      aria-label={`Očekivani rezultati, ${month.name}, ${week.label}`}
                      value={note.outcomes}
                      disabled={empty}
                      onChange={(e) => onNoteChange(key, 'outcomes', e.target.value)}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
