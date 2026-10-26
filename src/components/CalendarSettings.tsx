import { useState } from 'react'
import { getISODay, parseISO } from 'date-fns'
import type { CalendarChoices } from '../core/calendar'
import { calendarsForYear, requireCalendar } from '../core/calendars'

interface Props {
  choices: CalendarChoices
  onChange: (choices: CalendarChoices) => void
  /** Called when the teacher picks another canton/entity for the same school year */
  onSelectCalendar: (calendarId: string) => void
}

const WEEKDAYS = ['ponedjeljak', 'utorak', 'srijeda', 'četvrtak', 'petak', 'subota', 'nedjelja']

/** "2027-03-09" -> "09.03.2027. (utorak)" */
const formatDate = (iso: string) =>
  `${iso.slice(8, 10)}.${iso.slice(5, 7)}.${iso.slice(0, 4)}. (${WEEKDAYS[getISODay(parseISO(iso)) - 1]})`

/** "2026-09-01", "2026-12-31" -> "01.09. – 31.12.2026."; the first year is shown only when it differs */
function formatRange(start: string, end: string): string {
  const day = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`
  const first = start.slice(0, 4) === end.slice(0, 4) ? day(start) : `${day(start)}${start.slice(0, 4)}.`
  return `${first} – ${day(end)}${end.slice(0, 4)}.`
}

export function CalendarSettings({ choices, onChange, onSelectCalendar }: Props) {
  const [newDate, setNewDate] = useState('')
  const [newName, setNewName] = useState('')

  const def = requireCalendar(choices.calendarId)
  const end = def.endOfTeaching.find((o) => o.value === choices.endOfTeaching) ?? def.endOfTeaching[0]

  // The school year is chosen in "Osnovni podaci"; here only the canton/entity of that year.
  const sameYear = calendarsForYear(def.schoolYear)

  const toggleHoliday = (id: string, checked: boolean) =>
    onChange({
      ...choices,
      religiousHolidays: checked
        ? [...choices.religiousHolidays, id]
        : choices.religiousHolidays.filter((h) => h !== id),
    })

  const addExtraDay = () => {
    if (!newDate) return
    const extraDays = [...choices.extraDays, { date: newDate, name: newName.trim() }].sort((a, b) =>
      a.date.localeCompare(b.date),
    )
    onChange({ ...choices, extraDays })
    setNewDate('')
    setNewName('')
  }

  return (
    <section className="panel">
      <h2>Školski kalendar</h2>

      {sameYear.length > 1 ? (
        <label className="field">
          <span>Kanton / entitet</span>
          <select value={choices.calendarId} onChange={(e) => onSelectCalendar(e.target.value)}>
            {sameYear.map((c) => (
              <option key={c.id} value={c.id}>
                {c.region}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <p className="static-field">
          <span>Kanton / entitet</span>
          <strong>{def.region}</strong>
        </p>
      )}
      <p className="hint">
        Školska {def.schoolYear}. godina, prema kalendaru {def.source}.{' '}
        <a href={def.sourceUrl} target="_blank" rel="noreferrer">
          Izvorni dokument
        </a>
      </p>

      <dl className="facts">
        <dt>I polugodište</dt>
        <dd>{formatRange(def.semester1.start, def.semester1.end)}</dd>
        <dt>Zimski odmor</dt>
        <dd>{formatRange(def.winterBreak.start, def.winterBreak.end)}</dd>
        <dt>II polugodište</dt>
        <dd>{formatRange(def.secondSemesterStart, end.end)}</dd>
      </dl>

      <label className="field">
        <span>Završetak nastave</span>
        <select value={choices.endOfTeaching} onChange={(e) => onChange({ ...choices, endOfTeaching: e.target.value })}>
          {def.endOfTeaching.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {def.religiousHolidays.length > 0 && (
        <>
          <fieldset className="checks">
            <legend>Vjerski praznici (škola ne radi)</legend>
            {def.religiousHolidays.map((h) => (
              <label key={h.id}>
                <input
                  type="checkbox"
                  checked={choices.religiousHolidays.includes(h.id)}
                  onChange={(e) => toggleHoliday(h.id, e.target.checked)}
                />
                <span>
                  {h.name}
                  <small>{formatDate(h.date)}</small>
                </span>
              </label>
            ))}
          </fieldset>
          <p className="hint">{def.religiousHolidayNote}</p>
        </>
      )}

      {def.notes.length > 0 && (
        <ul className="calendar-notes">
          {def.notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}

      <h3 className="subheading">Dodatni dani bez nastave</h3>
      <p className="hint">Dan škole, ekskurzija, sportski dan i slično.</p>
      {choices.extraDays.length > 0 && (
        <ul className="extra-days">
          {choices.extraDays.map((d, i) => (
            <li key={`${d.date}-${i}`}>
              <span>
                {formatDate(d.date)}
                {d.name && <small>{d.name}</small>}
              </span>
              <button
                type="button"
                aria-label={`Ukloni ${d.name || formatDate(d.date)}`}
                onClick={() => onChange({ ...choices, extraDays: choices.extraDays.filter((_, j) => j !== i) })}
              >
                Ukloni
              </button>
            </li>
          ))}
        </ul>
      )}
      <label className="field">
        <span>Datum</span>
        <input
          type="date"
          value={newDate}
          min={def.semester1.start}
          max={def.schoolYearEnd}
          onChange={(e) => setNewDate(e.target.value)}
        />
      </label>
      <label className="field">
        <span>Naziv (nije obavezan)</span>
        <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} />
      </label>
      <button type="button" disabled={!newDate} onClick={addExtraDay}>
        Dodaj dan
      </button>
    </section>
  )
}
