import { describe, expect, it } from 'vitest'
import {
  achievedTotals,
  createEmptyProject,
  createNewPlan,
  isEmptyProject,
  monthKey,
  parseProject,
  projectFingerprint,
  setMonthNote,
  setThemeAt,
  setWeekNote,
  weekKey,
} from './project'
import { generatePlan } from './plan'
import { buildCalendar, defaultCalendarChoices } from './calendar'

const TEST_CALENDAR = buildCalendar(defaultCalendarChoices())

describe('setThemeAt', () => {
  it('pads gaps with empty strings and does not mutate the original', () => {
    const original = ['A']
    expect(setThemeAt(original, 3, 'D')).toEqual(['A', '', '', 'D'])
    expect(original).toEqual(['A'])
  })
})

describe('parseProject', () => {
  it('round-trips a saved project', () => {
    const project = createEmptyProject()
    project.info.schoolName = 'OŠ Test'
    project.schedule[1].hours = 2
    project.themes = ['Prva tema', '', 'Treća tema']
    project.weekNotes = { '2026-09|2026-09-07': { topic: 'Jezik', goals: 'cilj', outcomes: 'rezultat' } }
    project.monthNotes = { '2026-09': { achieved: '17', remark: 'napomena' } }
    expect(parseProject(JSON.stringify(project))).toEqual(project)
  })

  it('rejects files that are not valid plans', () => {
    expect(() => parseProject('not json')).toThrow(/nije ispravan plan/)
    expect(() => parseProject('{"version": 2}')).toThrow(/nije ispravan plan/)
    expect(() => parseProject('null')).toThrow(/nije ispravan plan/)
  })

  it('ignores bad values instead of crashing', () => {
    const text = JSON.stringify({
      version: 1,
      info: { schoolName: 5, city: 'Tuzla' },
      schedule: [{ weekday: 1, hours: 'x' }, { weekday: 2, hours: 3 }],
      themes: ['A', 7],
    })
    const loaded = parseProject(text)
    expect(loaded.info.schoolName).toBe('')
    expect(loaded.info.city).toBe('Tuzla')
    expect(loaded.schedule.map((e) => e.hours)).toEqual([0, 3, 0, 0, 0])
    expect(loaded.themes).toEqual(['A', ''])
  })
})

describe('week notes', () => {
  it('setWeekNote changes one field and keeps the rest', () => {
    const a = setWeekNote({}, 'k', 'goals', 'G')
    const b = setWeekNote(a, 'k', 'outcomes', 'O')
    expect(b).toEqual({ k: { topic: '', goals: 'G', outcomes: 'O' } })
    expect(a).toEqual({ k: { topic: '', goals: 'G', outcomes: '' } })
  })

  it('weekKey separates the two halves of a week that crosses a month boundary', () => {
    const plan = generatePlan([1, 2, 3, 4].map((weekday) => ({ weekday, hours: 1 })), TEST_CALENDAR)
    const sep = plan.months.find((m) => m.month === 9)!
    const oct = plan.months.find((m) => m.month === 10)!
    expect(weekKey(sep, sep.weeks.at(-1)!)).toBe('2026-09|2026-09-28')
    expect(weekKey(oct, oct.weeks[0])).toBe('2026-10|2026-09-28')
  })

  it('loads old files without weekNotes and drops malformed keys', () => {
    const old = { version: 1, info: {}, schedule: [], themes: [] }
    expect(parseProject(JSON.stringify(old)).weekNotes).toEqual({})
    const bad = { ...old, weekNotes: { __proto__x: { goals: 'x' }, '2026-09|2026-09-07': { goals: 'ok' } } }
    expect(parseProject(JSON.stringify(bad)).weekNotes).toEqual({
      '2026-09|2026-09-07': { topic: '', goals: 'ok', outcomes: '' },
    })
  })
})

describe('month notes and achieved totals', () => {
  const plan = generatePlan([1, 2, 3, 4].map((weekday) => ({ weekday, hours: 1 })), TEST_CALENDAR)
  const firstSemester = plan.months.filter((m) => m.semester === 1)
  const secondSemester = plan.months.filter((m) => m.semester === 2)
  const fill = (months: typeof plan.months, value = '10') =>
    Object.fromEntries(months.map((m) => [monthKey(m), { achieved: value, remark: '' }]))

  it('setMonthNote changes one field and keeps the other', () => {
    const a = setMonthNote({}, '2026-09', 'achieved', '17')
    expect(setMonthNote(a, '2026-09', 'remark', 'x')).toEqual({ '2026-09': { achieved: '17', remark: 'x' } })
  })

  it('returns null totals while any month is empty', () => {
    expect(achievedTotals(plan, {})).toEqual({ 1: null, 2: null, year: null })
    const almost = fill(firstSemester)
    almost[monthKey(firstSemester[0])].achieved = ''
    expect(achievedTotals(plan, almost)[1]).toBeNull()
  })

  it('totals each semester independently, and the year only when both are complete', () => {
    const onlyFirst = achievedTotals(plan, fill(firstSemester))
    expect(onlyFirst[1]).toBe(10 * firstSemester.length)
    expect(onlyFirst[2]).toBeNull()
    expect(onlyFirst.year).toBeNull()

    const all = achievedTotals(plan, { ...fill(firstSemester), ...fill(secondSemester, '0') })
    expect(all[2]).toBe(0) // zero counts as filled in
    expect(all.year).toBe(10 * firstSemester.length)
  })

  it('drops malformed month notes when loading', () => {
    const bad = {
      version: 1, info: {}, schedule: [], themes: [],
      monthNotes: { '2026-09': { achieved: 'abc', remark: 'ok' }, nope: { achieved: '5' }, '2026-10': { achieved: '12' } },
    }
    expect(parseProject(JSON.stringify(bad)).monthNotes).toEqual({
      '2026-09': { achieved: '', remark: 'ok' },
      '2026-10': { achieved: '12', remark: '' },
    })
  })
})

describe('unsaved changes (projectFingerprint)', () => {
  const filled = () => {
    const p = createEmptyProject()
    p.info = { schoolName: 'OŠ Test', city: 'Tuzla', subject: 'Bosanski jezik', grade: 'VI', teacherName: 'A B', directorName: 'C D' }
    p.schedule[0].hours = 1
    p.themes = ['Prva', 'Druga']
    p.weekNotes = { '2026-09|2026-09-07': { topic: 'Jezik', goals: 'cilj', outcomes: 'rezultat' } }
    p.monthNotes = { '2026-09': { achieved: '17', remark: 'napomena' } }
    p.calendar = { ...p.calendar, religiousHolidays: ['uskrs', 'pesah'], extraDays: [{ date: '2026-10-14', name: 'Dan škole' }] }
    return p
  }
  const print = projectFingerprint

  it('a plan equals itself and its saved-then-loaded copy', () => {
    const p = filled()
    expect(print(p)).toBe(print(structuredClone(p)))
    expect(print(parseProject(JSON.stringify(p)))).toBe(print(p))
    expect(print(parseProject(JSON.stringify(createEmptyProject())))).toBe(print(createEmptyProject()))
  })

  it('typing something and deleting it again is not a change', () => {
    const p = filled()
    const before = print(p)

    const themes = setThemeAt(setThemeAt(p.themes, 5, 'privremeno'), 5, '')
    expect(print({ ...p, themes })).toBe(before) // trailing empty themes do not count

    const weekNotes = setWeekNote(setWeekNote(p.weekNotes, 'k', 'goals', 'x'), 'k', 'goals', '')
    expect(print({ ...p, weekNotes })).toBe(before) // a note emptied again does not count

    const monthNotes = setMonthNote(setMonthNote(p.monthNotes, '2026-10', 'remark', 'x'), '2026-10', 'remark', '')
    expect(print({ ...p, monthNotes })).toBe(before)

    // also a brand-new plan where something was typed and removed
    const fresh = createEmptyProject()
    expect(print({ ...fresh, themes: setThemeAt(fresh.themes, 2, '') })).toBe(print(fresh))
  })

  it('any real change is noticed', () => {
    const p = filled()
    const before = print(p)
    const changed = [
      { ...p, info: { ...p.info, city: 'Sarajevo' } },
      { ...p, info: { ...p.info, subject: '' } },
      { ...p, schedule: p.schedule.map((e) => ({ ...e, hours: e.weekday === 2 ? 1 : e.hours })) },
      { ...p, themes: setThemeAt(p.themes, 1, 'Izmijenjena') },
      { ...p, themes: setThemeAt(p.themes, 4, 'Nova') },
      { ...p, weekNotes: setWeekNote(p.weekNotes, '2026-09|2026-09-07', 'outcomes', 'drugačije') },
      { ...p, monthNotes: setMonthNote(p.monthNotes, '2026-09', 'achieved', '16') },
      { ...p, calendar: { ...p.calendar, endOfTeaching: 'firstGrade' } },
      { ...p, calendar: { ...p.calendar, religiousHolidays: ['uskrs'] } },
      { ...p, calendar: { ...p.calendar, extraDays: [] } },
      { ...p, calendar: { ...p.calendar, calendarId: 'ks-2026-2027' } },
    ]
    for (const [i, c] of changed.entries()) expect(print(c), `change #${i}`).not.toBe(before)
  })

  it('the order of religious holidays and extra days is not a change', () => {
    const p = filled()
    const reordered = {
      ...p,
      calendar: {
        ...p.calendar,
        religiousHolidays: ['pesah', 'uskrs'],
        extraDays: [...p.calendar.extraDays].reverse(),
      },
    }
    expect(print(reordered)).toBe(print(p))
  })

  it('isEmptyProject is true only for a plan with nothing in it', () => {
    expect(isEmptyProject(createEmptyProject())).toBe(true)
    expect(isEmptyProject(filled())).toBe(false)
    const withSchoolOnly = createEmptyProject()
    withSchoolOnly.info.schoolName = 'OŠ Test'
    expect(isEmptyProject(withSchoolOnly)).toBe(false)
  })
})

describe('createNewPlan ("Novi plan")', () => {
  const plan = () => {
    const p = createEmptyProject()
    p.info = { schoolName: 'OŠ Test', city: 'Tuzla', subject: 'Bosanski jezik', grade: 'VI', teacherName: 'A B', directorName: 'C D' }
    p.schedule[0].hours = 2
    p.themes = ['Prva']
    p.weekNotes = { '2026-09|2026-09-07': { topic: 'Jezik', goals: 'g', outcomes: 'o' } }
    p.monthNotes = { '2026-09': { achieved: '17', remark: 'n' } }
    p.calendar = {
      calendarId: 'ks-2026-2027',
      endOfTeaching: 'firstNinthPrimary',
      religiousHolidays: [],
      extraDays: [{ date: '2026-10-14', name: 'Dan škole' }],
    }
    return p
  }

  it('clears everything when the basics are not kept', () => {
    expect(createNewPlan(plan(), false)).toEqual(createEmptyProject())
  })

  it('keeps school details and the calendar, and clears what belongs to the class', () => {
    const next = createNewPlan(plan(), true)
    expect(next.info).toEqual({ schoolName: 'OŠ Test', city: 'Tuzla', subject: '', grade: '', teacherName: 'A B', directorName: 'C D' })
    expect(next.calendar.calendarId).toBe('ks-2026-2027') // the canton stays
    expect(next.calendar.extraDays).toEqual([{ date: '2026-10-14', name: 'Dan škole' }]) // so does Dan škole
    expect(next.calendar.endOfTeaching).toBe('regular') // class-specific, back to the default
    expect(next.schedule.every((e) => e.hours === 0)).toBe(true)
    expect(next.themes).toEqual([])
    expect(next.weekNotes).toEqual({})
    expect(next.monthNotes).toEqual({})
  })

  it('does not change the plan it starts from', () => {
    const p = plan()
    const before = JSON.stringify(p)
    createNewPlan(p, true)
    createNewPlan(p, false)
    expect(JSON.stringify(p)).toBe(before)
  })

  it('the new plan counts as saved against its own fingerprint, and as empty when nothing was kept', () => {
    expect(isEmptyProject(createNewPlan(plan(), false))).toBe(true)
    expect(isEmptyProject(createNewPlan(plan(), true))).toBe(false)
  })
})
