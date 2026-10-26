import { defaultCalendarChoices, parseCalendarChoices } from './calendar'
import type { CalendarChoices } from './calendar'
import type { MonthPlan, ScheduleEntry, WeekPlan, YearPlan } from './types'

/** Basic information that is repeated across the exported documents. */
export interface SchoolInfo {
  schoolName: string
  city: string
  subject: string
  grade: string
  teacherName: string
  directorName: string
}

/** What the teacher writes for one week row of a monthly table. */
export interface WeekNote {
  /** "Nastavna tema" */
  topic: string
  /** "Ciljevi i zadaci" */
  goals: string
  /** "Očekivani rezultati" */
  outcomes: string
}

/** What the teacher writes for one month row of the yearly table. */
export interface MonthNote {
  /** "Ostvareno" - number of hours actually held, as typed. '' means not filled in yet. */
  achieved: string
  /** "Napomena" */
  remark: string
}

/** Everything the user enters. This whole object is what gets saved to / loaded from a file. */
export interface ProjectData {
  version: 1
  info: SchoolInfo
  /** Always one entry per weekday, Monday-Friday. hours = 0 means no class that day. */
  schedule: ScheduleEntry[]
  /** One theme per lesson slot, in order. May be longer than the number of slots. */
  themes: string[]
  /** Nastavna tema, ciljevi i zadaci, očekivani rezultati per week, keyed by weekKey(). */
  weekNotes: Record<string, WeekNote>
  /** Ostvareno and napomena per month of the yearly table, keyed by monthKey(). */
  monthNotes: Record<string, MonthNote>
  /** End of classes, religious holidays that apply to the school, extra days without classes. */
  calendar: CalendarChoices
}

export const WEEKDAY_NAMES = ['Ponedjeljak', 'Utorak', 'Srijeda', 'Četvrtak', 'Petak']

export function createEmptyProject(): ProjectData {
  return {
    version: 1,
    info: {
      schoolName: '',
      city: '',
      subject: '',
      grade: '',
      teacherName: '',
      directorName: '',
    },
    schedule: WEEKDAY_NAMES.map((_, i) => ({ weekday: i + 1, hours: 0 })),
    themes: [],
    weekNotes: {},
    monthNotes: {},
    calendar: defaultCalendarChoices(),
  }
}

/**
 * Identifies one week row of one month, e.g. "2026-09|2026-09-28".
 * A week that crosses a month boundary appears in two months, so the month is part of the key.
 */
export function weekKey(month: MonthPlan, week: WeekPlan): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}|${week.weekStart}`
}

/** Identifies one month row of the yearly table, e.g. "2026-09". */
export function monthKey(month: MonthPlan): string {
  return `${month.year}-${String(month.month).padStart(2, '0')}`
}

/** Returns a new weekNotes object with one field of one week changed. */
export function setWeekNote(
  notes: Record<string, WeekNote>,
  key: string,
  field: keyof WeekNote,
  value: string,
): Record<string, WeekNote> {
  const current = notes[key] ?? { topic: '', goals: '', outcomes: '' }
  return { ...notes, [key]: { ...current, [field]: value } }
}

/** Returns a new monthNotes object with one field of one month changed. */
export function setMonthNote(
  notes: Record<string, MonthNote>,
  key: string,
  field: keyof MonthNote,
  value: string,
): Record<string, MonthNote> {
  const current = notes[key] ?? { achieved: '', remark: '' }
  return { ...notes, [key]: { ...current, [field]: value } }
}

/**
 * Totals of "ostvareno" for the lines under the yearly table.
 * A total is only calculated when every month it covers has a value; otherwise null
 * (the document then shows a blank line to fill in later).
 */
export function achievedTotals(
  plan: YearPlan,
  monthNotes: Record<string, MonthNote>,
): { 1: number | null; 2: number | null; year: number | null } {
  const sum = (months: MonthPlan[]): number | null => {
    if (months.length === 0) return null
    let total = 0
    for (const m of months) {
      const value = monthNotes[monthKey(m)]?.achieved ?? ''
      if (value.trim() === '') return null
      total += Number(value)
    }
    return total
  }
  const first = sum(plan.months.filter((m) => m.semester === 1))
  const second = sum(plan.months.filter((m) => m.semester === 2))
  return { 1: first, 2: second, year: first !== null && second !== null ? first + second : null }
}

/** Returns a new themes list with the theme at `index` replaced (padding gaps with ''). */
export function setThemeAt(themes: string[], index: number, value: string): string[] {
  const next = [...themes]
  while (next.length <= index) next.push('')
  next[index] = value
  return next
}

/** Reads a saved project file. Throws an Error with a Bosnian message if the file is invalid. */
export function parseProject(text: string): ProjectData {
  const invalid = new Error('Datoteka nije ispravan plan. Odaberite datoteku koju je spremila ova aplikacija.')
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw invalid
  }
  if (typeof raw !== 'object' || raw === null) throw invalid
  const data = raw as Partial<ProjectData>
  if (data.version !== 1 || !data.info || !Array.isArray(data.schedule) || !Array.isArray(data.themes)) {
    throw invalid
  }

  const empty = createEmptyProject()
  const info = { ...empty.info }
  for (const key of Object.keys(info) as (keyof SchoolInfo)[]) {
    const value = (data.info as Partial<SchoolInfo>)[key]
    if (typeof value === 'string') info[key] = value
  }

  const schedule = empty.schedule.map((entry) => {
    const found = data.schedule!.find((e) => e?.weekday === entry.weekday)
    const hours = Number(found?.hours)
    return { ...entry, hours: Number.isInteger(hours) && hours >= 0 && hours <= 12 ? hours : 0 }
  })

  const themes = data.themes.map((t) => (typeof t === 'string' ? t : ''))

  // Older files have no weekNotes. Only keys shaped like weekKey() output are accepted.
  const weekNotes: Record<string, WeekNote> = {}
  const rawNotes = data.weekNotes
  if (typeof rawNotes === 'object' && rawNotes !== null) {
    for (const [key, value] of Object.entries(rawNotes)) {
      if (!/^\d{4}-\d{2}\|\d{4}-\d{2}-\d{2}$/.test(key)) continue
      const note = value as Partial<WeekNote> | null
      weekNotes[key] = {
        topic: typeof note?.topic === 'string' ? note.topic : '',
        goals: typeof note?.goals === 'string' ? note.goals : '',
        outcomes: typeof note?.outcomes === 'string' ? note.outcomes : '',
      }
    }
  }

  // Older files have no monthNotes. Achieved must be a whole number (or empty).
  const monthNotes: Record<string, MonthNote> = {}
  const rawMonths = data.monthNotes
  if (typeof rawMonths === 'object' && rawMonths !== null) {
    for (const [key, value] of Object.entries(rawMonths)) {
      if (!/^\d{4}-\d{2}$/.test(key)) continue
      const note = value as Partial<MonthNote> | null
      monthNotes[key] = {
        achieved: typeof note?.achieved === 'string' && /^\d{1,3}$/.test(note.achieved) ? note.achieved : '',
        remark: typeof note?.remark === 'string' ? note.remark : '',
      }
    }
  }

  // Throws if the plan needs a calendar this version of the app doesn't have.
  const calendar = parseCalendarChoices(data.calendar)

  return { version: 1, info, schedule, themes, weekNotes, monthNotes, calendar }
}

/**
 * A text that is the same for two plans exactly when they hold the same information. It is used to
 * tell whether a plan has unsaved changes: compare it with the fingerprint taken at the last save.
 *
 * Things that carry no information are ignored, so typing something and deleting it again does not
 * count as a change: empty notes, empty themes at the end of the list, and the order of the
 * religious holidays and extra days.
 */
export function projectFingerprint(project: ProjectData): string {
  const themes = [...project.themes]
  while (themes.length > 0 && themes[themes.length - 1].trim() === '') themes.pop()

  const byKey = <T,>(entries: [string, T][]) => entries.sort(([a], [b]) => a.localeCompare(b))

  const weekNotes = byKey(
    Object.entries(project.weekNotes)
      .filter(([, n]) => n.topic !== '' || n.goals !== '' || n.outcomes !== '')
      .map(([key, n]): [string, [string, string, string]] => [key, [n.topic, n.goals, n.outcomes]]),
  )
  const monthNotes = byKey(
    Object.entries(project.monthNotes)
      .filter(([, n]) => n.achieved !== '' || n.remark !== '')
      .map(([key, n]): [string, [string, string]] => [key, [n.achieved, n.remark]]),
  )

  const { info, schedule, calendar } = project
  return JSON.stringify({
    info: [info.schoolName, info.city, info.subject, info.grade, info.teacherName, info.directorName],
    schedule: schedule.map((e) => [e.weekday, e.hours]),
    themes,
    weekNotes,
    monthNotes,
    calendar: [
      calendar.calendarId,
      calendar.endOfTeaching,
      [...calendar.religiousHolidays].sort(),
      calendar.extraDays.map((d) => [d.date, d.name]).sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1])),
    ],
  })
}

/** True for a plan that still has nothing in it, exactly as it is when the app starts. */
export function isEmptyProject(project: ProjectData): boolean {
  return projectFingerprint(project) === projectFingerprint(createEmptyProject())
}

/**
 * The plan to show after "Novi plan".
 *  - keepBasics = false: everything is cleared, like starting the app.
 *  - keepBasics = true: the school details (school, city, teacher, director) and the calendar
 *    (canton, school year, religious holidays, extra days) stay. Subject, class, end of classes,
 *    schedule, themes and notes are cleared, because they belong to the class the plan was for.
 */
export function createNewPlan(current: ProjectData, keepBasics: boolean): ProjectData {
  const fresh = createEmptyProject()
  if (!keepBasics) return fresh
  const { schoolName, city, teacherName, directorName } = current.info
  return {
    ...fresh,
    info: { ...fresh.info, schoolName, city, teacherName, directorName },
    calendar: {
      ...defaultCalendarChoices(current.calendar.calendarId),
      religiousHolidays: [...current.calendar.religiousHolidays],
      extraDays: current.calendar.extraDays.map((d) => ({ ...d })),
    },
  }
}
