import { format } from 'date-fns'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SetupForm } from './components/SetupForm'
import { ScheduleEditor } from './components/ScheduleEditor'
import { CalendarSettings } from './components/CalendarSettings'
import { YearlyTable } from './components/YearlyTable'
import { MonthlyPlan } from './components/MonthlyPlan'
import { Dialog } from './components/Dialog'
import type { DialogConfig, DialogResult } from './components/Dialog'
import { buildCalendar, defaultCalendarChoices } from './core/calendar'
import { clearDraft, readDraft, writeDraft } from './core/draft'
import { saveTextFile, saveWordFile } from './files'
import { shortenText } from './core/text'
import { monthlyFileName, yearlyFileName } from './export/names'
import { moveTheme, removeThemeAt } from './core/themes'
import { pickCalendarForYear, schoolYears } from './core/calendars'
import { generatePlan } from './core/plan'
import {
  createEmptyProject,
  createNewPlan,
  isEmptyProject,
  parseProject,
  projectFingerprint,
  setMonthNote,
  setThemeAt,
  setWeekNote,
} from './core/project'
import type { ProjectData } from './core/project'
import type { MonthPlan } from './core/types'

export default function App() {
  const [project, setProject] = useState<ProjectData>(createEmptyProject)
  // Success messages fade out after 10 s; error messages stay until the next action.
  const [message, setMessage] = useState<{ text: string; kind: 'info' | 'error'; id: number } | null>(null)
  const messageCounter = useRef(0)
  const showMessage = (text: string, kind: 'info' | 'error' = 'info') =>
    setMessage({ text, kind, id: ++messageCounter.current })
  const [view, setView] = useState<'yearly' | 'monthly'>('yearly')

  // "Unsaved changes" means: the plan differs from how it was when it was last saved, loaded or
  // started. Typing something and deleting it again is not a change.
  const fingerprint = useMemo(() => projectFingerprint(project), [project])
  const [savedFingerprint, setSavedFingerprint] = useState(() => projectFingerprint(createEmptyProject()))
  const dirty = fingerprint !== savedFingerprint

  // Our own dialog box, used instead of the browser's confirm(). askDialog() resolves with the
  // button the user pressed, so the code that needs the answer can simply await it.
  const [dialog, setDialog] = useState<{ config: DialogConfig; resolve: (result: DialogResult) => void } | null>(null)
  const askDialog = (config: DialogConfig) =>
    new Promise<DialogResult>((resolve) => setDialog({ config, resolve }))

  // Automatic draft in this browser. Until the question "restore the old draft?" is answered,
  // nothing is written, so an old draft cannot be overwritten by the new, empty plan.
  const [draftChecked, setDraftChecked] = useState(false)
  const draftQuestionStarted = useRef(false)
  const latest = useRef({ project, dirty, draftChecked })
  useEffect(() => {
    latest.current = { project, dirty, draftChecked }
  })

  useEffect(() => {
    if (draftQuestionStarted.current) return // (development mode runs effects twice)
    draftQuestionStarted.current = true
    const draft = readDraft()
    if (!draft || isEmptyProject(draft.project)) {
      clearDraft()
      setDraftChecked(true)
      return
    }
    const when = format(new Date(draft.savedAt), "dd.MM.yyyy. 'u' HH:mm")
    void askDialog({
      title: 'Pronađen nespremljen plan',
      message:
        `U ovom pregledniku je pronađen plan koji nije spremljen u datoteku (zadnja izmjena ${when}). ` +
        'Želite li ga vratiti?',
      buttons: [
        { id: 'discard', label: 'Odbaci', kind: 'danger' },
        { id: 'restore', label: 'Vrati plan', kind: 'primary', autoFocus: true },
      ],
      // Escape or a click outside must never throw work away
      cancelId: 'restore',
    }).then((answer) => {
      if (answer.choice === 'restore') setProject(draft.project) // still counts as unsaved
      else clearDraft()
      setDraftChecked(true)
    })
  }, [])

  // Keep the draft up to date while there are unsaved changes, and remove it once the plan is
  // saved to a file (or started afresh), so a finished plan is not offered again.
  useEffect(() => {
    if (!draftChecked) return
    if (!dirty) {
      clearDraft()
      return
    }
    const timer = setTimeout(() => writeDraft(project), 500)
    return () => clearTimeout(timer)
  }, [draftChecked, dirty, project])

  // Write the latest state right away when the page is hidden or closed
  useEffect(() => {
    const flush = () => {
      const { project: current, dirty: isDirty, draftChecked: checked } = latest.current
      if (checked && isDirty) writeDraft(current)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])
  const fileInput = useRef<HTMLInputElement>(null)

  // Recalculated only when the schedule or the calendar choices change. Theme edits don't touch it.
  const calendar = useMemo(() => buildCalendar(project.calendar), [project.calendar])
  const plan = useMemo(() => generatePlan(project.schedule, calendar), [project.schedule, calendar])

  useEffect(() => {
    if (message?.kind !== 'info') return
    const timer = setTimeout(() => setMessage(null), 10000)
    return () => clearTimeout(timer)
  }, [message])

  // Closing the tab or window with unsaved changes. The browser shows its own fixed message here;
  // that one cannot be replaced.
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  // Picking a school year or a canton switches to another calendar. The religious holidays and
  // extra days belong to one calendar, so they are cleared, after asking if there are any.
  const selectCalendar = async (calendarId: string) => {
    if (calendarId === project.calendar.calendarId) return
    const hasChoices = project.calendar.religiousHolidays.length > 0 || project.calendar.extraDays.length > 0
    if (hasChoices) {
      const answer = await askDialog({
        title: 'Promjena kalendara',
        message: 'Promjena kalendara briše odabrane vjerske praznike i dodatne dane. Želite li nastaviti?',
        buttons: [
          { id: 'cancel', label: 'Odustani', autoFocus: true },
          { id: 'continue', label: 'Nastavi', kind: 'danger' },
        ],
        cancelId: 'cancel',
      })
      if (answer.choice !== 'continue') return
    }
    setProject((p) => ({ ...p, calendar: defaultCalendarChoices(calendarId) }))
  }

  const selectSchoolYear = (year: string) => {
    const next = pickCalendarForYear(year, project.calendar.calendarId)
    if (next) selectCalendar(next.id)
  }

  // Returns false when the teacher closed the "Save as" window without saving.
  const saveProject = async (options: { silent?: boolean } = {}): Promise<boolean> => {
    const printAtSave = fingerprint
    const result = await saveTextFile(
      JSON.stringify(project, null, 2),
      `plan-${calendar.schoolYear.replace('/', '-')}.json`,
    )
    if (result === 'cancelled') return false
    setSavedFingerprint(printAtSave)
    if (!options.silent) {
      showMessage(result === 'saved' ? 'Plan je spremljen.' : 'Plan je preuzet (pogledajte mapu Preuzimanja).')
    }
    return true
  }

  const loadProject = async (file: File) => {
    try {
      const loaded = parseProject(await file.text())
      setProject(loaded)
      setSavedFingerprint(projectFingerprint(loaded))
      showMessage('Plan je učitan.')
    } catch (error) {
      showMessage(error instanceof Error ? error.message : 'Učitavanje nije uspjelo.', 'error')
    }
  }

  // "Učitaj plan" replaces the current plan, so unsaved changes are asked about first.
  const requestLoad = async () => {
    if (dirty) {
      const answer = await askDialog({
        title: 'Učitaj plan',
        message: 'Plan ima nespremljene promjene, a učitavanje drugog plana će ih zamijeniti.',
        buttons: [
          { id: 'cancel', label: 'Odustani' },
          { id: 'discard', label: 'Odbaci promjene i učitaj', kind: 'danger' },
          { id: 'save', label: 'Spremi i učitaj plan', kind: 'primary', autoFocus: true },
        ],
        cancelId: 'cancel',
      })
      if (answer.choice === 'cancel') return
      if (answer.choice === 'save' && !(await saveProject({ silent: true }))) return
    }
    fileInput.current?.click()
  }

  const startNewPlan = async () => {
    if (isEmptyProject(project)) {
      showMessage('Plan je već prazan.')
      return
    }

    const keepBasics = {
      label: 'Zadrži osnovne podatke i školski kalendar',
      checked: true,
      hint:
        'Zadržava se: naziv škole, mjesto, nastavnik/ca, direktor/ica, školska godina, kanton, vjerski praznici i dodatni dani. ' +
        'Briše se: predmet, razred, završetak nastave, raspored, teme i bilješke.',
    }

    const answer = dirty
      ? await askDialog({
          title: 'Novi plan',
          message: 'Plan ima nespremljene promjene. Želite li ga spremiti prije početka novog plana?',
          checkbox: keepBasics,
          buttons: [
            { id: 'cancel', label: 'Odustani' },
            { id: 'discard', label: 'Odbaci promjene', kind: 'danger' },
            { id: 'save', label: 'Spremi i počni novi plan', kind: 'primary', autoFocus: true },
          ],
          cancelId: 'cancel',
        })
      : await askDialog({
          title: 'Novi plan',
          message: 'Trenutni plan je spremljen. Novi plan briše sve što je sada na ekranu.',
          checkbox: keepBasics,
          buttons: [
            { id: 'cancel', label: 'Odustani', autoFocus: true },
            { id: 'discard', label: 'Počni novi plan', kind: 'primary' },
          ],
          cancelId: 'cancel',
        })

    if (answer.choice === 'cancel') return
    if (answer.choice === 'save' && !(await saveProject({ silent: true }))) return

    const next = createNewPlan(project, answer.checked)
    setProject(next)
    setSavedFingerprint(projectFingerprint(next))
    showMessage(answer.choice === 'save' ? 'Plan je spremljen. Novi plan je započet.' : 'Novi plan je započet.')
  }

  // The Word library is large, so it is only loaded when the first export is requested.
  // The "Save as" window is opened first, straight from the click. The Word library is only
  // loaded and the document only built after the teacher has chosen where to save it.
  const exportYearly = async () => {
    try {
      const result = await saveWordFile(yearlyFileName(calendar), async () => {
        const [yearly, shared] = await Promise.all([import('./export/yearly'), import('./export/shared')])
        return shared.documentToBlob(yearly.buildYearlyDocument(project, calendar, plan))
      })
      if (result !== 'cancelled') {
        showMessage(
          result === 'saved' ? 'Godišnji plan je spremljen.' : 'Godišnji plan je preuzet (pogledajte mapu Preuzimanja).',
        )
      }
    } catch {
      showMessage('Izvoz nije uspio. Pokušajte ponovo.', 'error')
    }
  }

  const exportMonthly = async (month: MonthPlan) => {
    try {
      const result = await saveWordFile(monthlyFileName(month), async () => {
        const [monthly, shared] = await Promise.all([import('./export/monthly'), import('./export/shared')])
        return shared.documentToBlob(monthly.buildMonthlyDocument(project, calendar, month))
      })
      if (result !== 'cancelled') {
        showMessage(
          result === 'saved'
            ? `Mjesečni plan (${month.name}) je spremljen.`
            : `Mjesečni plan (${month.name}) je preuzet (pogledajte mapu Preuzimanja).`,
        )
      }
    } catch {
      showMessage('Izvoz nije uspio. Pokušajte ponovo.', 'error')
    }
  }

  // Removing a theme moves all the themes after it up, so the teacher is asked first.
  const removeTheme = async (index: number) => {
    const text = (project.themes[index] ?? '').trim()
    const shortText = shortenText(text, 60)
    const answer = await askDialog({
      title: text ? 'Ukloniti temu?' : 'Ukloniti prazno mjesto?',
      message: text
        ? `Tema „${shortText}“ bit će uklonjena iz plana, a sve teme ispod nje pomjerit će se jedno mjesto gore. ` +
          'Zbog toga neke teme mogu preći u raniji mjesec.'
        : 'Ovo mjesto nema temu. Ako ga uklonite, sve teme ispod njega pomjerit će se jedno mjesto gore. ' +
          'Zbog toga neke teme mogu preći u raniji mjesec.',
      buttons: [
        { id: 'cancel', label: 'Odustani', autoFocus: true },
        { id: 'remove', label: text ? 'Ukloni temu' : 'Ukloni mjesto', kind: 'danger' },
      ],
      cancelId: 'cancel',
    })
    if (answer.choice !== 'remove') return
    setProject((p) => ({ ...p, themes: removeThemeAt(p.themes, index) }))
    showMessage(text ? 'Tema je uklonjena.' : 'Prazno mjesto je uklonjeno.')
  }

  return (
    <>
      <header className="topbar">
        <h1>Plan nastavnih sadržaja</h1>
        <div className="actions">
          {message && (
            <span key={message.id} className={`message ${message.kind}`} role="status">
              {message.text}
            </span>
          )}
          {dirty && (
            <span className="unsaved" role="status">
              <span className="unsaved-dot" aria-hidden="true" />
              Nespremljene promjene
            </span>
          )}
          <button type="button" onClick={() => void startNewPlan()}>
            Novi plan
          </button>
          <button type="button" onClick={() => void requestLoad()}>
            Učitaj plan
          </button>
          {/* highlighted only when there is something to save */}
          <button type="button" className={dirty ? 'primary' : ''} onClick={() => void saveProject()}>
            Spremi plan
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void loadProject(file)
              e.target.value = '' // allow loading the same file again
            }}
          />
        </div>
      </header>

      <main className="layout">
        <aside className="sidebar">
          <div className="sidebar-column">
            <SetupForm
              info={project.info}
              schoolYear={calendar.schoolYear}
              schoolYears={schoolYears()}
              onSchoolYearChange={selectSchoolYear}
              onChange={(info) => setProject({ ...project, info })}
            />
            <ScheduleEditor
              schedule={project.schedule}
              onChange={(schedule) => setProject({ ...project, schedule })}
            />
          </div>
          <div className="sidebar-column">
            <CalendarSettings
              choices={project.calendar}
              onChange={(calendar) => setProject({ ...project, calendar })}
              onSelectCalendar={selectCalendar}
            />
          </div>
        </aside>
        <div className="content">
          <div className="view-tabs" role="group" aria-label="Prikaz">
            <button
              type="button"
              className={view === 'yearly' ? 'selected' : ''}
              aria-pressed={view === 'yearly'}
              onClick={() => setView('yearly')}
            >
              Godišnji plan
            </button>
            <button
              type="button"
              className={view === 'monthly' ? 'selected' : ''}
              aria-pressed={view === 'monthly'}
              onClick={() => setView('monthly')}
            >
              Mjesečni planovi
            </button>
          </div>
          {view === 'yearly' ? (
            <YearlyTable
              plan={plan}
              themes={project.themes}
              monthNotes={project.monthNotes}
              onThemeChange={(index, value) =>
                setProject((p) => ({ ...p, themes: setThemeAt(p.themes, index, value) }))
              }
              onMonthNoteChange={(key, field, value) =>
                setProject((p) => ({ ...p, monthNotes: setMonthNote(p.monthNotes, key, field, value) }))
              }
              onRemoveTheme={(index) => void removeTheme(index)}
              onMoveTheme={(from, insertBefore) =>
                setProject((p) => ({ ...p, themes: moveTheme(p.themes, from, insertBefore) }))
              }
              onExport={exportYearly}
            />
          ) : (
            <MonthlyPlan
              plan={plan}
              themes={project.themes}
              weekNotes={project.weekNotes}
              onNoteChange={(key, field, value) =>
                setProject((p) => ({ ...p, weekNotes: setWeekNote(p.weekNotes, key, field, value) }))
              }
              onExport={exportMonthly}
            />
          )}
        </div>
      </main>

      {dialog && (
        <Dialog
          config={dialog.config}
          onResult={(result) => {
            dialog.resolve(result)
            setDialog(null)
          }}
        />
      )}
    </>
  )
}
