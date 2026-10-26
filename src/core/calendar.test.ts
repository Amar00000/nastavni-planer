import { describe, expect, it } from 'vitest'
import { buildCalendar, defaultCalendarChoices, parseCalendarChoices } from './calendar'
import type { CalendarChoices } from './calendar'
import {
  CALENDARS,
  LEGACY_CALENDAR_ID,
  calendarsForYear,
  getCalendarDefinition,
  pickCalendarForYear,
  schoolYears,
} from './calendars'
import { generatePlan } from './plan'
import { createEmptyProject, parseProject } from './project'

const everyDay = [1, 2, 3, 4, 5].map((weekday) => ({ weekday, hours: 1 }))
const plan = (choices: Partial<CalendarChoices> = {}, schedule = everyDay) =>
  generatePlan(schedule, buildCalendar({ ...defaultCalendarChoices(), ...choices }))

describe('Tuzlanski kanton calendar 2026/2027', () => {
  it('follows the official semester dates', () => {
    const p = plan()
    expect(p.lessons[0].date).toBe('2026-09-01') // first day of classes, a Tuesday
    const dec = p.months.find((m) => m.month === 12)!
    expect(dec.weeks.at(-1)!.lessons.at(-1)!.date).toBe('2026-12-31') // last day of semester I
    // winter break 01.01.-28.01.2027.: January has a single school day, Friday 29.01.
    const jan = p.months.find((m) => m.month === 1)!
    expect(jan.semester).toBe(2)
    expect(jan.weeks.flatMap((w) => w.lessons).map((l) => l.date)).toEqual(['2027-01-29'])
    expect(p.lessons.some((l) => l.date >= '2027-01-01' && l.date <= '2027-01-28')).toBe(false)
  })

  it('has no classes on the days every school is closed', () => {
    const dates = new Set(plan().lessons.map((l) => l.date))
    for (const closed of ['2026-10-05', '2026-11-25', '2027-03-01']) expect(dates.has(closed)).toBe(false)
    expect(dates.has('2026-10-06')).toBe(true) // the day after is a normal day
  })

  it('matches the official number of teaching days when the usual religious holidays are chosen', () => {
    // A published count for this calendar: 85 teaching days in semester I and 182 in total,
    // which assumes Božić, both bajrams and Uskrs are free days (Pesah is not counted).
    const p = plan({ religiousHolidays: ['katolicki-bozic', 'ramazanski-bajram', 'uskrs', 'kurban-bajram'] })
    expect(p.semesterTotals[1]).toBe(85)
    expect(p.total).toBe(182)
  })

  it('a religious holiday only removes lessons when it is chosen', () => {
    const without = plan().total
    expect(plan({ religiousHolidays: ['pesah'] }).total).toBe(without - 1)
    expect(plan({ religiousHolidays: ['pesah', 'uskrs'] }).total).toBe(without - 2)
  })

  it('ends classes on the right day for each class type', () => {
    const lastDate = (end: string) => plan({ endOfTeaching: end }).lessons.at(-1)!.date
    expect(lastDate('regular')).toBe('2027-06-18')
    expect(lastDate('firstGrade')).toBe('2027-06-11')
    expect(lastDate('finalPrimary')).toBe('2027-05-28')
    expect(lastDate('finalSecondary')).toBe('2027-05-14')
  })

  it('removes school-specific days, and ignores ones outside the school days', () => {
    const base = plan().total
    expect(plan({ extraDays: [{ date: '2026-10-14', name: 'Dan škole' }] }).total).toBe(base - 1)
    // a Saturday and a day in the winter break change nothing
    expect(
      plan({ extraDays: [{ date: '2026-10-17', name: '' }, { date: '2027-01-15', name: '' }] }).total,
    ).toBe(base)
  })

  it('leaves out a month that has no lessons at all', () => {
    // Mon-Thu only: January's single school day (Friday 29th) has no lesson for this schedule
    const monThu = plan({}, [1, 2, 3, 4].map((weekday) => ({ weekday, hours: 1 })))
    expect(monThu.months.map((m) => m.month)).not.toContain(1)
    // with Friday lessons January appears, with its one lesson
    expect(plan().months.find((m) => m.month === 1)!.total).toBe(1)
  })
})

describe('saved calendar choices', () => {
  it('round-trip', () => {
    const project = createEmptyProject()
    project.calendar = {
      calendarId: LEGACY_CALENDAR_ID,
      endOfTeaching: 'firstGrade',
      religiousHolidays: ['uskrs', 'pesah'],
      extraDays: [{ date: '2026-10-14', name: 'Dan škole' }],
    }
    const loaded = parseProject(JSON.stringify(project)).calendar
    expect(loaded.endOfTeaching).toBe('firstGrade')
    expect(loaded.religiousHolidays.sort()).toEqual(['pesah', 'uskrs'])
    expect(loaded.extraDays).toEqual([{ date: '2026-10-14', name: 'Dan škole' }])
  })

  it('older files without a calendar get the defaults, and bad values are dropped', () => {
    const old = { version: 1, info: {}, schedule: [], themes: [] }
    expect(parseProject(JSON.stringify(old)).calendar).toEqual(defaultCalendarChoices(LEGACY_CALENDAR_ID))
    const bad = {
      ...old,
      calendar: {
        endOfTeaching: 'nonsense',
        religiousHolidays: ['uskrs', 'nope'],
        extraDays: [{ date: 'x', name: 'a' }, { date: '2026-10-14' }, { date: '2026-11-02', name: 'ok' }],
      },
    }
    expect(parseProject(JSON.stringify(bad)).calendar).toEqual({
      calendarId: LEGACY_CALENDAR_ID,
      endOfTeaching: 'regular',
      religiousHolidays: ['uskrs'],
      extraDays: [{ date: '2026-11-02', name: 'ok' }],
    })
  })
})

describe('calendar data', () => {
  const ISO = /^\d{4}-\d{2}-\d{2}$/
  const isRealDate = (iso: string) => ISO.test(iso) && !Number.isNaN(Date.parse(iso)) && new Date(iso).toISOString().startsWith(iso)

  it('has unique ids, and the legacy calendar is still available', () => {
    const ids = CALENDARS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(getCalendarDefinition(LEGACY_CALENDAR_ID)).toBeDefined()
  })

  // These catch typos when a new year is added: every date must be real and in a sensible order.
  describe.each(CALENDARS.map((c) => [c.id, c] as const))('%s', (_id, c) => {
    it('has real dates in a sensible order', () => {
      const all = [
        c.semester1.start, c.semester1.end, c.winterBreak.start, c.winterBreak.end,
        c.secondSemesterStart, c.schoolYearEnd,
        ...c.endOfTeaching.map((o) => o.end),
        ...c.noClasses.flatMap((d) => [d.start, d.end]),
        ...c.religiousHolidays.map((h) => h.date),
        ...c.scheduleSwaps.map((w) => w.date),
      ]
      for (const d of all) expect(isRealDate(d), d).toBe(true)

      expect(c.semester1.start < c.semester1.end).toBe(true)
      expect(c.semester1.end < c.winterBreak.start).toBe(true)
      expect(c.winterBreak.end < c.secondSemesterStart).toBe(true)
      for (const o of c.endOfTeaching) {
        expect(o.end > c.secondSemesterStart, o.value).toBe(true)
        expect(o.end <= c.schoolYearEnd, o.value).toBe(true)
      }
      for (const d of c.noClasses) expect(d.start <= d.end, d.name).toBe(true)
      for (const date of [...c.noClasses.map((d) => d.start), ...c.religiousHolidays.map((h) => h.date)]) {
        expect(date >= c.semester1.start && date <= c.schoolYearEnd, date).toBe(true)
      }
    })

    it('has schedule swaps only on open school days, with the weekday printed in the calendar', () => {
      const isoWeekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay() || 7
      const closed = (date: string) => c.noClasses.some((d) => date >= d.start && date <= d.end)
      for (const w of c.scheduleSwaps) {
        expect(isoWeekday(w.date), `${w.date} weekday`).toBe(w.weekday) // catches a mistyped date
        expect(w.weekday >= 1 && w.weekday <= 5, w.date).toBe(true)
        expect(w.useWeekday >= 1 && w.useWeekday <= 5, w.date).toBe(true)
        expect(closed(w.date), `${w.date} is a closed day`).toBe(false)
        const inSemester =
          (w.date >= c.semester1.start && w.date <= c.semester1.end) ||
          (w.date >= c.secondSemesterStart && w.date <= c.schoolYearEnd)
        expect(inSemester, w.date).toBe(true)
      }
    })

    it('has at least one end-of-teaching option, unique option and holiday ids', () => {
      expect(c.endOfTeaching.length).toBeGreaterThan(0)
      expect(new Set(c.endOfTeaching.map((o) => o.value)).size).toBe(c.endOfTeaching.length)
      expect(new Set(c.religiousHolidays.map((h) => h.id)).size).toBe(c.religiousHolidays.length)
    })

    it('school years in the id and the dates agree', () => {
      const [from, to] = c.schoolYear.split('/')
      expect(c.semester1.start.startsWith(from)).toBe(true)
      expect(c.schoolYearEnd.startsWith(to)).toBe(true)
      expect(c.id.endsWith(`${from}-${to}`)).toBe(true)
    })

    it('builds a calendar that produces lessons', () => {
      const built = buildCalendar(defaultCalendarChoices(c.id))
      expect(built.schoolYear).toBe(c.schoolYear)
      expect(generatePlan(everyDay, built).total).toBeGreaterThan(100)
    })
  })
})

describe('calendar selection in saved plans', () => {
  it('keeps the calendar a plan was made with', () => {
    const project = createEmptyProject()
    project.calendar = defaultCalendarChoices(LEGACY_CALENDAR_ID)
    expect(parseProject(JSON.stringify(project)).calendar.calendarId).toBe(LEGACY_CALENDAR_ID)
  })

  it('refuses a plan made with a calendar this version does not know, instead of changing it', () => {
    const project = { ...createEmptyProject(), calendar: { ...defaultCalendarChoices(), calendarId: 'tk-2099-2100' } }
    expect(() => parseProject(JSON.stringify(project))).toThrow(/ne poznaje/)
    expect(() => parseCalendarChoices({ calendarId: 'tk-2099-2100' })).toThrow(/Ažurirajte/)
  })

  it('files saved before calendars had ids are read with the calendar they were made with', () => {
    const { calendarId: _ignored, ...withoutId } = defaultCalendarChoices()
    void _ignored
    expect(parseCalendarChoices(withoutId).calendarId).toBe(LEGACY_CALENDAR_ID)
  })
})

describe('choosing a school year', () => {
  /** Temporarily adds fake calendars to the list, newest first, and restores it afterwards. */
  function withExtraCalendars(extra: { id: string; schoolYear: string; region: string }[], check: () => void) {
    const original = [...CALENDARS]
    try {
      for (const e of [...extra].reverse()) CALENDARS.unshift({ ...CALENDARS[CALENDARS.length - 1], ...e })
      check()
    } finally {
      CALENDARS.splice(0, CALENDARS.length, ...original)
    }
  }

  it('lists each school year once, newest first', () => {
    expect(schoolYears()).toEqual(['2026/2027'])
    withExtraCalendars(
      [
        { id: 'tk-2027-2028', schoolYear: '2027/2028', region: 'Tuzlanski kanton' },
        { id: 'sk-2027-2028', schoolYear: '2027/2028', region: 'Kanton Sarajevo' },
      ],
      () => {
        expect(schoolYears()).toEqual(['2027/2028', '2026/2027'])
        expect(calendarsForYear('2027/2028').map((c) => c.id)).toEqual(['tk-2027-2028', 'sk-2027-2028'])
      },
    )
  })

  it('picks the calendar of the same canton when the year changes', () => {
    withExtraCalendars(
      [
        { id: 'tk-2027-2028', schoolYear: '2027/2028', region: 'Tuzlanski kanton' },
        { id: 'sk-2027-2028', schoolYear: '2027/2028', region: 'Kanton Sarajevo' },
      ],
      () => {
        expect(pickCalendarForYear('2027/2028', 'tk-2026-2027')?.id).toBe('tk-2027-2028')
        expect(pickCalendarForYear('2026/2027', 'tk-2027-2028')?.id).toBe('tk-2026-2027')
      },
    )
  })

  it('falls back to the first calendar of the year when its canton has none', () => {
    withExtraCalendars([{ id: 'sk-2027-2028', schoolYear: '2027/2028', region: 'Kanton Sarajevo' }], () => {
      expect(pickCalendarForYear('2027/2028', 'tk-2026-2027')?.id).toBe('sk-2027-2028')
    })
  })

  it('returns nothing for a year without calendars', () => {
    expect(pickCalendarForYear('1999/2000', 'tk-2026-2027')).toBeUndefined()
  })
})

describe('Kanton Sarajevo calendar 2026/2027', () => {
  const ks = (choices: Partial<CalendarChoices> = {}, schedule = everyDay) =>
    generatePlan(schedule, buildCalendar({ ...defaultCalendarChoices('ks-2026-2027'), ...choices }))
  const only = (weekday: number, hours: number) => [1, 2, 3, 4, 5].map((d) => ({ weekday: d, hours: d === weekday ? hours : 0 }))
  const lessonsOn = (p: ReturnType<typeof ks>, date: string) => p.lessons.filter((l) => l.date === date).length

  it('has its own semester dates: winter break the whole of January, classes resume 1 February', () => {
    const p = ks()
    expect(p.lessons[0].date).toBe('2026-09-01')
    expect(p.lessons.some((l) => l.date >= '2027-01-01' && l.date <= '2027-01-31')).toBe(false)
    expect(p.lessons.find((l) => l.semester === 2)!.date).toBe('2027-02-01')
    expect(p.months.map((m) => m.month)).not.toContain(1)
  })

  it('has no classes on the religious and state holidays it lists', () => {
    const dates = new Set(ks().lessons.map((l) => l.date))
    for (const closed of ['2026-10-05', '2026-11-25', '2026-12-25', '2027-03-01', '2027-03-09', '2027-03-29', '2027-05-03', '2027-05-17']) {
      expect(dates.has(closed), closed).toBe(false)
    }
  })

  it('ends classes on the right day for each class type', () => {
    const last = (end: string) => ks({ endOfTeaching: end }).lessons.at(-1)!.date
    expect(last('regular')).toBe('2027-06-11')
    expect(last('firstNinthPrimary')).toBe('2027-06-04')
    expect(last('finalSecondary')).toBe('2027-05-06')
  })

  it("teaches another day's schedule on swapped days", () => {
    // Monday 5 October is a day off; Tuesday 6 October is taught "po rasporedu od ponedjeljka"
    const monday = ks({}, only(1, 2))
    expect(lessonsOn(monday, '2026-10-05')).toBe(0)
    expect(lessonsOn(monday, '2026-10-06')).toBe(2)
    expect(lessonsOn(monday, '2026-10-13')).toBe(0) // an ordinary Tuesday has no Monday lessons

    // Thursday 24 December is taught by Friday's schedule, and Friday 25 December is a holiday
    const friday = ks({}, only(5, 1))
    expect(lessonsOn(friday, '2026-12-24')).toBe(1)
    expect(lessonsOn(friday, '2026-12-25')).toBe(0)

    // 6 and 7 May swap Thursday and Friday
    const thursday = ks({}, only(4, 1))
    expect(lessonsOn(thursday, '2027-05-06')).toBe(0)
    expect(lessonsOn(thursday, '2027-05-07')).toBe(1)
  })

  it('a swapped day still has no lessons when it is marked as a day off', () => {
    const p = ks({ extraDays: [{ date: '2026-10-06', name: 'Dan škole' }] }, only(1, 2))
    expect(lessonsOn(p, '2026-10-06')).toBe(0)
  })

  it('does not apply its swaps to other cantons', () => {
    const tuzla = generatePlan(only(1, 2), buildCalendar(defaultCalendarChoices('tk-2026-2027')))
    expect(lessonsOn(tuzla, '2026-10-06')).toBe(0)
  })

  it('has no optional religious holidays, and each canton keeps its own choices', () => {
    expect(getCalendarDefinition('ks-2026-2027')!.religiousHolidays).toEqual([])
    expect(defaultCalendarChoices('ks-2026-2027').endOfTeaching).toBe('regular')
    expect(parseCalendarChoices({ calendarId: 'ks-2026-2027', endOfTeaching: 'finalPrimary' }).endOfTeaching).toBe('regular')
  })
})
