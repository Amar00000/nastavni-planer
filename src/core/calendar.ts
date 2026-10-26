import { CALENDARS, LEGACY_CALENDAR_ID, getCalendarDefinition, requireCalendar } from './calendars'
import type { ClosedPeriod, SchoolCalendar } from './types'

/** A day without classes added by the school (Dan škole, excursion, sports day...). */
export interface ExtraDay {
  date: string
  name: string
}

/** What the teacher chose about the calendar. Saved with the project. */
export interface CalendarChoices {
  /** Which calendar from calendars.ts this plan was made with */
  calendarId: string
  /** a value from the calendar's endOfTeaching options */
  endOfTeaching: string
  /** ids from the calendar's religiousHolidays */
  religiousHolidays: string[]
  extraDays: ExtraDay[]
}

/** Choices for a new plan: the given calendar (the newest by default) with nothing selected. */
export function defaultCalendarChoices(calendarId: string = CALENDARS[0].id): CalendarChoices {
  const def = requireCalendar(calendarId)
  return {
    calendarId,
    endOfTeaching: def.endOfTeaching[0].value,
    religiousHolidays: [],
    extraDays: [],
  }
}

/** Turns the chosen calendar plus the teacher's choices into the dates generatePlan() needs. */
export function buildCalendar(choices: CalendarChoices): SchoolCalendar {
  const def = requireCalendar(choices.calendarId)
  const end = (def.endOfTeaching.find((o) => o.value === choices.endOfTeaching) ?? def.endOfTeaching[0]).end

  const religious: ClosedPeriod[] = def.religiousHolidays
    .filter((h) => choices.religiousHolidays.includes(h.id))
    .map((h) => ({ start: h.date, end: h.date, name: h.name }))

  const extra: ClosedPeriod[] = choices.extraDays.map((d) => ({ start: d.date, end: d.date, name: d.name }))

  return {
    schoolYear: def.schoolYear,
    semester1: def.semester1,
    semester2: { start: def.secondSemesterStart, end },
    closedPeriods: [...def.noClasses, ...religious, ...extra],
    scheduleSwaps: def.scheduleSwaps,
  }
}

/**
 * Reads the calendar part of a saved plan.
 *  - Files from before calendars had ids use the calendar they were made with (LEGACY_CALENDAR_ID).
 *  - A plan that names a calendar this version doesn't know is refused rather than silently
 *    recalculated with different dates.
 *  - Unknown options inside a known calendar are ignored.
 */
export function parseCalendarChoices(raw: unknown): CalendarChoices {
  const saved = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<CalendarChoices>
  const id = typeof saved.calendarId === 'string' ? saved.calendarId : LEGACY_CALENDAR_ID
  const def = getCalendarDefinition(id)
  if (!def) {
    throw new Error(
      'Ovaj plan koristi školski kalendar koji ova verzija aplikacije ne poznaje. Ažurirajte aplikaciju na najnoviju verziju.',
    )
  }

  const choices = defaultCalendarChoices(id)
  if (def.endOfTeaching.some((o) => o.value === saved.endOfTeaching)) {
    choices.endOfTeaching = saved.endOfTeaching as string
  }
  if (Array.isArray(saved.religiousHolidays)) {
    const chosen = saved.religiousHolidays
    choices.religiousHolidays = def.religiousHolidays.map((h) => h.id).filter((hid) => chosen.includes(hid))
  }
  if (Array.isArray(saved.extraDays)) {
    choices.extraDays = saved.extraDays
      .filter(
        (d): d is ExtraDay =>
          typeof d?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d.date) && typeof d?.name === 'string',
      )
      .map((d) => ({ date: d.date, name: d.name }))
  }
  return choices
}
