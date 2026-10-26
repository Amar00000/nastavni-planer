import { useEffect, useRef, useState } from 'react'
import type { MonthPlan, YearPlan } from '../core/types'
import { themeFor, unassignedThemes } from '../core/plan'
import { achievedTotals, monthKey } from '../core/project'
import type { MonthNote } from '../core/project'
import { hasThemeFrom, movedIndex } from '../core/themes'
import { shortenText } from '../core/text'
import { ArrowDownIcon, ArrowUpIcon, CloseIcon, MoveIcon } from './icons'

interface Props {
  plan: YearPlan
  themes: string[]
  monthNotes: Record<string, MonthNote>
  onThemeChange: (index: number, value: string) => void
  onMonthNoteChange: (key: string, field: keyof MonthNote, value: string) => void
  /** Takes the theme out; the ones after it move up. The caller asks for confirmation. */
  onRemoveTheme: (index: number) => void
  /** Moves the theme at `from` into the gap in front of lesson `insertBefore` */
  onMoveTheme: (from: number, insertBefore: number) => void
  onExport: () => void
}

/** "2026-09-01" -> "01.09." */
const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}.`

/** What the keyboard focus goes to after a theme was moved, so the screen follows the theme */
type FocusTarget = { index: number; what: 'input' | 'up' | 'down' }

interface MonthBlockProps {
  month: MonthPlan
  themes: string[]
  /** Number of lessons in the whole year */
  total: number
  monthNotes: Record<string, MonthNote>
  /** The lesson being moved, while the teacher is choosing where to put it */
  moving: number | null
  onThemeChange: (index: number, value: string) => void
  onMonthNoteChange: (key: string, field: keyof MonthNote, value: string) => void
  onRemove: (index: number) => void
  onStep: (index: number, direction: 'up' | 'down') => void
  onPickUp: (index: number) => void
  onDrop: (insertBefore: number) => void
}

function MonthBlock({
  month,
  themes,
  total,
  monthNotes,
  moving,
  onThemeChange,
  onMonthNoteChange,
  onRemove,
  onStep,
  onPickUp,
  onDrop,
}: MonthBlockProps) {
  const lessons = month.weeks.flatMap((w) => w.lessons)
  const key = monthKey(month)
  const note = monthNotes[key] ?? { achieved: '', remark: '' }

  // A gap next to the lesson being moved would not change anything, so it is not offered.
  const canDrop = (gap: number) => moving !== null && gap !== moving && gap !== moving + 1

  const dropSlot = (gap: number, label: string) => (
    <li key={`gap-${gap}`} className="drop-slot">
      <button type="button" onClick={() => onDrop(gap)} aria-label={label}>
        Umetni ovdje
      </button>
    </li>
  )

  return (
    <div className="month">
      <h4>
        {month.name} <span className="count">Planirano časova: {month.total}</span>
      </h4>
      {lessons.length === 0 ? (
        <p className="hint">Nema časova u ovom mjesecu.</p>
      ) : (
        <ol className="lessons">
          {lessons.flatMap((lesson, i) => {
            const rows = []
            if (canDrop(lesson.index)) {
              rows.push(dropSlot(lesson.index, `Umetni ovdje, ispred časa ${i + 1} (${month.name})`))
            }
            rows.push(
              <li key={lesson.index} className={moving === lesson.index ? 'moving' : undefined}>
                <span className="lesson-no">{i + 1}.</span>
                <input
                  id={`lesson-${lesson.index}`}
                  type="text"
                  aria-label={`${month.name}, čas ${i + 1}`}
                  value={themeFor(themes, lesson)}
                  onChange={(e) => onThemeChange(lesson.index, e.target.value)}
                />
                <span className="lesson-date">{shortDate(lesson.date)}</span>
                {moving === null && (
                  <span className="lesson-actions">
                    <button
                      type="button"
                      id={`lesson-${lesson.index}-up`}
                      className="icon-btn"
                      title="Pomjeri za jedno mjesto gore"
                      aria-label={`Pomjeri gore: ${month.name}, čas ${i + 1}`}
                      disabled={lesson.index === 0}
                      onClick={() => onStep(lesson.index, 'up')}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      type="button"
                      id={`lesson-${lesson.index}-down`}
                      className="icon-btn"
                      title="Pomjeri za jedno mjesto dolje"
                      aria-label={`Pomjeri dolje: ${month.name}, čas ${i + 1}`}
                      disabled={lesson.index === total - 1}
                      onClick={() => onStep(lesson.index, 'down')}
                    >
                      <ArrowDownIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Premjesti na drugo mjesto (npr. u drugi mjesec)"
                      aria-label={`Premjesti: ${month.name}, čas ${i + 1}`}
                      onClick={() => onPickUp(lesson.index)}
                    >
                      <MoveIcon />
                    </button>
                    <button
                      type="button"
                      className="icon-btn danger"
                      title="Ukloni temu (sve ispod pomjera se gore)"
                      aria-label={`Ukloni temu: ${month.name}, čas ${i + 1}`}
                      disabled={!hasThemeFrom(themes, lesson.index)}
                      onClick={() => onRemove(lesson.index)}
                    >
                      <CloseIcon />
                    </button>
                  </span>
                )}
              </li>,
            )
            // the gap after the last lesson of the month (the same place as in front of the next month)
            if (i === lessons.length - 1 && canDrop(lesson.index + 1)) {
              rows.push(dropSlot(lesson.index + 1, `Umetni ovdje, na kraj mjeseca (${month.name})`))
            }
            return rows
          })}
        </ol>
      )}
      <div className="month-notes">
        <label className="field">
          <span>Ostvareno časova</span>
          <input
            type="number"
            min={0}
            max={999}
            value={note.achieved}
            onChange={(e) => onMonthNoteChange(key, 'achieved', e.target.value)}
          />
        </label>
        <label className="field">
          <span>Napomena</span>
          <input
            type="text"
            value={note.remark}
            onChange={(e) => onMonthNoteChange(key, 'remark', e.target.value)}
          />
        </label>
      </div>
    </div>
  )
}

/** Shows the number, or the blank line used in the document when it can't be calculated yet. */
const orBlank = (value: number | null) => (value === null ? '______' : String(value))

export function YearlyTable({
  plan,
  themes,
  monthNotes,
  onThemeChange,
  onMonthNoteChange,
  onRemoveTheme,
  onMoveTheme,
  onExport,
}: Props) {
  // The lesson whose theme was "picked up" and now waits for the teacher to choose its new place
  const [pickedUp, setPickedUp] = useState<number | null>(null)
  const moving = pickedUp !== null && pickedUp < plan.total ? pickedUp : null
  const focusAfterMove = useRef<FocusTarget | null>(null)

  // After a move, bring the theme into view and put the keyboard focus where the teacher was
  useEffect(() => {
    const target = focusAfterMove.current
    if (!target) return
    focusAfterMove.current = null
    const suffix = target.what === 'input' ? '' : `-${target.what}`
    document.getElementById(`lesson-${target.index}${suffix}`)?.focus()
  }, [themes])

  // Escape gives up moving
  useEffect(() => {
    if (moving === null) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPickedUp(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [moving])

  const step = (index: number, direction: 'up' | 'down') => {
    const insertBefore = direction === 'up' ? index - 1 : index + 2
    focusAfterMove.current = { index: movedIndex(index, insertBefore), what: direction }
    onMoveTheme(index, insertBefore)
  }

  const drop = (insertBefore: number) => {
    if (moving === null) return
    focusAfterMove.current = { index: movedIndex(moving, insertBefore), what: 'input' }
    onMoveTheme(moving, insertBefore)
    setPickedUp(null)
  }


  if (plan.total === 0) {
    return (
      <section className="panel">
        <h2>Godišnji plan</h2>
        <p className="hint">Unesite sedmični raspored da bi se prikazala tablica godišnjeg plana.</p>
      </section>
    )
  }

  const leftover = unassignedThemes(themes, plan)
  const achieved = achievedTotals(plan, monthNotes)

  return (
    <section className="panel">
      <div className="panel-head">
        <h2>Godišnji plan</h2>
        <button type="button" className="primary" onClick={onExport}>
          Preuzmi Word dokument
        </button>
      </div>
      {moving !== null && (
        <div className="move-banner" role="status">
          <span>
            Premještate temu <strong>„{shortenText(themes[moving] ?? '', 60) || 'prazno mjesto'}“</strong>. Pomaknite se do željenog
            mjesta i kliknite <strong>Umetni ovdje</strong>.
          </span>
          <button type="button" onClick={() => setPickedUp(null)}>
            Odustani
          </button>
        </div>
      )}
      {([1, 2] as const).map((semester) => {
        const months = plan.months.filter((m) => m.semester === semester)
        const roman = semester === 1 ? 'I' : 'II'
        return (
          <div key={semester} className="semester">
            <h3>{roman} polugodište</h3>
            {months.map((m) => (
              <MonthBlock
                key={`${m.year}-${m.month}`}
                month={m}
                themes={themes}
                total={plan.total}
                monthNotes={monthNotes}
                moving={moving}
                onThemeChange={onThemeChange}
                onMonthNoteChange={onMonthNoteChange}
                onRemove={onRemoveTheme}
                onStep={step}
                onPickUp={setPickedUp}
                onDrop={drop}
              />
            ))}
            <p className="totals">
              Planirano časova u {roman} polugodištu: <strong>{plan.semesterTotals[semester]}</strong>
              <span className="totals-achieved">
                Ostvareno: <strong>{orBlank(achieved[semester])}</strong>
              </span>
            </p>
          </div>
        )
      })}
      <p className="totals year-totals">
        Planirano časova u toku školske godine: <strong>{plan.total}</strong>
        <span className="totals-achieved">
          Ostvareno časova u toku školske godine: <strong>{orBlank(achieved.year)}</strong>
        </span>
      </p>
      {leftover.length > 0 && (
        <div className="warning" role="status">
          <strong>Teme bez časa ({leftover.length}):</strong> raspored ima manje časova nego što je unesenih tema.
          Ove teme su sačuvane i vratit će se ako povećate broj časova.
          <ul>
            {leftover.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
