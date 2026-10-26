import type { ClosedPeriod, DateRange, ScheduleSwap } from './types'

/**
 * The school calendars the app knows about. This file is DATA: adding a new school year means
 * adding one entry to the list below, with no code changes.
 *
 * How to add a calendar each summer:
 *  1. Read the ministry's new calendar for the canton/entity.
 *  2. Copy the newest entry, put the copy FIRST in CALENDARS (the first entry is the default for
 *     new plans), and change its id, dates and holidays to match the new document.
 *  3. Run `npm test`. The consistency tests in calendar.test.ts catch most typos in dates.
 *  4. Each canton publishes its own calendar, so each canton/year is its own entry. Dates may
 *     differ between cantons even when the wording sounds the same, so copy from that canton's
 *     own document, not from another canton's entry.
 *  5. NEVER delete or edit an old entry in a way that changes its dates. Saved plans remember
 *     the id of the calendar they were made with, so old plans keep working only if it stays.
 */

export interface EndOfTeachingOption {
  /** Stored in saved plans */
  value: string
  label: string
  /** Last day of classes in the second semester */
  end: string
}

export interface ReligiousHoliday {
  /** Stored in saved plans */
  id: string
  name: string
  date: string
}

export interface CalendarDefinition {
  /** Stored in saved plans, e.g. "tk-2026-2027". Never change it once published. */
  id: string
  region: string
  schoolYear: string
  /** Where the dates come from, shown to the teacher */
  source: string
  /** Link to the official document, shown to the teacher so they can check it */
  sourceUrl: string
  /** Last day of the school year (the date picker for extra days stops here) */
  schoolYearEnd: string
  semester1: DateRange
  /** Shown to the teacher only; the days between the semesters simply have no classes */
  winterBreak: DateRange
  secondSemesterStart: string
  /** The first option is the default */
  endOfTeaching: EndOfTeachingOption[]
  /** Days when no school has classes (state holidays and similar) */
  noClasses: ClosedPeriod[]
  /** Holidays that only apply to some schools, so the teacher chooses */
  religiousHolidays: ReligiousHoliday[]
  /** Explains the religious holiday checkboxes. Empty when the calendar has none. */
  religiousHolidayNote: string
  /** Days taught by another weekday's schedule. Empty for most calendars. */
  scheduleSwaps: ScheduleSwap[]
  /** Extra remarks shown under the calendar (things the teacher should know or double-check) */
  notes: string[]
}

/** Newest first. The first entry is the default for new plans. */
export const CALENDARS: CalendarDefinition[] = [
  {
    id: 'tk-2026-2027',
    region: 'Tuzlanski kanton',
    schoolYear: '2026/2027',
    source: 'Ministarstva obrazovanja i nauke TK od 17.07.2026. (broj 10/1-34-021453/26)',
    sourceUrl: 'https://osbukinje.skolatk.edu.ba/file/skolski-kalendar-2026-2027/115',
    schoolYearEnd: '2027-08-31',
    semester1: { start: '2026-09-01', end: '2026-12-31' },
    winterBreak: { start: '2027-01-01', end: '2027-01-28' },
    secondSemesterStart: '2027-01-29',
    endOfTeaching: [
      { value: 'regular', label: 'Redovno (do 18.06.2027.)', end: '2027-06-18' },
      { value: 'firstGrade', label: 'I razred osnovne škole (do 11.06.2027.)', end: '2027-06-11' },
      { value: 'finalPrimary', label: 'Završni razred osnovne škole (do 28.05.2027.)', end: '2027-05-28' },
      { value: 'finalSecondary', label: 'Završni razred srednje škole (do 14.05.2027.)', end: '2027-05-14' },
    ],
    noClasses: [
      { start: '2026-10-05', end: '2026-10-05', name: 'Svjetski dan učitelja (radni nenastavni dan)' },
      { start: '2026-11-25', end: '2026-11-25', name: 'Dan državnosti BiH' },
      { start: '2027-01-01', end: '2027-01-02', name: 'Nova godina' },
      { start: '2027-03-01', end: '2027-03-01', name: 'Dan nezavisnosti BiH' },
      { start: '2027-05-01', end: '2027-05-02', name: 'Međunarodni praznik rada' },
    ],
    // Not listed because they do not affect school days: Pravoslavni Božić (07.01.2027., winter
    // break) and Vaskrs (02.05.2027., a Sunday).
    religiousHolidays: [
      { id: 'katolicki-bozic', name: 'Katolički Božić', date: '2026-12-25' },
      { id: 'ramazanski-bajram', name: 'Ramazanski bajram', date: '2027-03-09' },
      { id: 'uskrs', name: 'Uskrs', date: '2027-03-29' },
      { id: 'pesah', name: 'Pesah', date: '2027-04-21' },
      { id: 'kurban-bajram', name: 'Kurban bajram', date: '2027-05-17' },
    ],
    religiousHolidayNote:
      'Škola ne radi jedan dan vjerskog praznika kada preko 50% učenika pripada istoj nacionalnosti. ' +
      'Označite praznike koji važe za vašu školu. Pravoslavni Božić (07.01.) pada u zimski odmor, ' +
      'a Vaskrs (02.05.) u nedjelju, pa ne utiču na plan.',
    scheduleSwaps: [],
    notes: [],
  },
  {
    id: 'ks-2026-2027',
    region: 'Kanton Sarajevo',
    schoolYear: '2026/2027',
    source: 'Ministarstva za odgoj i obrazovanje Kantona Sarajevo (Školski kalendar za školsku 2026/2027. godinu, objavljen 29.07.2026.)',
    sourceUrl: 'https://mo.ks.gov.ba/aktuelno/novosti/skolski-kalendar-za-skolsku-20262027-godinu',
    schoolYearEnd: '2027-08-31',
    semester1: { start: '2026-09-01', end: '2026-12-31' },
    winterBreak: { start: '2027-01-01', end: '2027-01-31' },
    secondSemesterStart: '2027-02-01',
    endOfTeaching: [
      { value: 'regular', label: 'Redovno (do 11.06.2027.)', end: '2027-06-11' },
      { value: 'firstNinthPrimary', label: 'I i IX razred osnovne škole (do 04.06.2027.)', end: '2027-06-04' },
      { value: 'finalSecondary', label: 'Završni razredi srednje škole (do 06.05.2027.)', end: '2027-05-06' },
    ],
    noClasses: [
      { start: '2026-10-05', end: '2026-10-05', name: 'Dan nastavnika (radni nenastavni dan)' },
      { start: '2026-11-25', end: '2026-11-25', name: 'Dan državnosti BiH' },
      { start: '2026-12-25', end: '2026-12-25', name: 'Božić (po gregorijanskom kalendaru)' },
      { start: '2027-01-01', end: '2027-01-02', name: 'Nova godina' },
      { start: '2027-03-01', end: '2027-03-01', name: 'Dan nezavisnosti BiH' },
      { start: '2027-03-09', end: '2027-03-09', name: 'Ramazanski bajram' },
      { start: '2027-03-29', end: '2027-03-29', name: 'Uskrsni ponedjeljak (po gregorijanskom kalendaru)' },
      { start: '2027-05-01', end: '2027-05-03', name: 'Praznik rada' },
      { start: '2027-05-16', end: '2027-05-17', name: 'Kurban-bajram' },
    ],
    religiousHolidays: [],
    religiousHolidayNote: '',
    // "u utorak, 6.10., po rasporedu od ponedjeljka" and so on, as printed in the calendar
    scheduleSwaps: [
      { date: '2026-10-06', weekday: 2, useWeekday: 1 },
      { date: '2026-12-24', weekday: 4, useWeekday: 5 },
      { date: '2027-03-03', weekday: 3, useWeekday: 1 },
      { date: '2027-04-02', weekday: 5, useWeekday: 1 },
      { date: '2027-05-06', weekday: 4, useWeekday: 5 },
      { date: '2027-05-07', weekday: 5, useWeekday: 4 },
      { date: '2027-05-20', weekday: 4, useWeekday: 1 },
    ],
    notes: [
      'Božić, Ramazanski bajram, Uskrsni ponedjeljak i Kurban-bajram su u ovom kalendaru dani bez nastave za sve škole.',
      'Na dane kada se nastava izvodi po rasporedu drugog dana (npr. utorak 06.10. po rasporedu ponedjeljka) aplikacija koristi raspored tog drugog dana.',
      'Zimski raspust: u PDF-u kalendara stoji 28.01., a u korigovanom prilogu i saopćenju Ministarstva 31.01. Aplikacija koristi 31.01. (nastava u II polugodištu počinje 01.02.).',
      'Veliki petak i Hanuka nisu uračunati kao dani bez nastave.',
    ],
  },
]

/**
 * Plan files saved before calendars had ids were all made with this calendar. It must stay in the
 * list forever, and must never be replaced by a newer one.
 */
export const LEGACY_CALENDAR_ID = 'tk-2026-2027'

export function getCalendarDefinition(id: string): CalendarDefinition | undefined {
  return CALENDARS.find((c) => c.id === id)
}

/** Like getCalendarDefinition, for ids that are known to be valid (the app validates them on load). */
export function requireCalendar(id: string): CalendarDefinition {
  const found = getCalendarDefinition(id)
  if (!found) throw new Error(`Nepoznat školski kalendar: ${id}`)
  return found
}

/** The school years that have at least one calendar, in list order (newest first). */
export function schoolYears(): string[] {
  return [...new Set(CALENDARS.map((c) => c.schoolYear))]
}

export function calendarsForYear(schoolYear: string): CalendarDefinition[] {
  return CALENDARS.filter((c) => c.schoolYear === schoolYear)
}

/**
 * The calendar to use after the teacher picks a school year: the one for the same canton/entity
 * as the current calendar if that year has one, otherwise the first calendar of that year.
 */
export function pickCalendarForYear(schoolYear: string, currentId: string): CalendarDefinition | undefined {
  const forYear = calendarsForYear(schoolYear)
  const region = getCalendarDefinition(currentId)?.region
  return forYear.find((c) => c.region === region) ?? forYear[0]
}
