import { describe, expect, it } from 'vitest'
import { generatePlan, themeFor, unassignedThemes } from './plan'
import type { ScheduleEntry, SchoolCalendar } from './types'

// NOTE: this is a made-up calendar for testing only, NOT the real Tuzla canton calendar.
const baseCalendar: SchoolCalendar = {
  schoolYear: '2026/2027',
  semester1: { start: '2026-09-01', end: '2026-12-25' },
  semester2: { start: '2027-02-01', end: '2027-06-11' },
  closedPeriods: [],
}

// Monday-Thursday, 1 hour each (4 hours per week)
const monToThu: ScheduleEntry[] = [1, 2, 3, 4].map((weekday) => ({ weekday, hours: 1 }))

const september = (calendar = baseCalendar, schedule = monToThu) =>
  generatePlan(schedule, calendar).months.find((m) => m.month === 9)!

describe('generatePlan', () => {
  it('splits September 2026 into weeks (starts on a Tuesday, so week 1 is short)', () => {
    const sep = september()
    expect(sep.name).toBe('Septembar')
    expect(sep.weeks.map((w) => w.label)).toEqual([
      'Prva sedmica',
      'Druga sedmica',
      'Treća sedmica',
      'Četvrta sedmica',
      'Peta sedmica',
    ])
    expect(sep.weeks.map((w) => w.lessons.length)).toEqual([3, 4, 4, 4, 3])
    expect(sep.total).toBe(18)
  })

  it('a week that crosses a month boundary appears in both months', () => {
    const plan = generatePlan(monToThu, baseCalendar)
    const oct = plan.months.find((m) => m.month === 10)!
    // Week of Mon 28 Sep: Thursday 1 Oct belongs to October
    expect(oct.weeks[0].weekStart).toBe('2026-09-28')
    expect(oct.weeks[0].lessons.map((l) => l.date)).toEqual(['2026-10-01'])
  })

  it('removes lessons on a holiday', () => {
    const calendar = {
      ...baseCalendar,
      closedPeriods: [{ start: '2026-09-08', end: '2026-09-08', name: 'Test praznik' }],
    }
    expect(september(calendar).weeks.map((w) => w.lessons.length)).toEqual([3, 3, 4, 4, 3])
  })

  it('lists a fully closed week with 0 lessons and continues numbering after it', () => {
    const calendar = {
      ...baseCalendar,
      closedPeriods: [{ start: '2026-09-14', end: '2026-09-18', name: 'Test raspust' }],
    }
    const sep = september(calendar)
    expect(sep.weeks[2].label).toBe('Treća sedmica')
    expect(sep.weeks[2].lessons.length).toBe(0)
    // Lesson indexes continue without a gap across the empty week
    const lastOfWeek2 = sep.weeks[1].lessons.at(-1)!
    const firstOfWeek4 = sep.weeks[3].lessons[0]
    expect(firstOfWeek4.index).toBe(lastOfWeek2.index + 1)
  })

  it('supports several hours on the same day', () => {
    const sep = september(baseCalendar, [{ weekday: 2, hours: 2 }])
    // Tuesdays in Sept 2026: 1, 8, 15, 22, 29
    expect(sep.total).toBe(10)
  })

  it('does not generate lessons or months outside the semesters', () => {
    const plan = generatePlan(monToThu, baseCalendar)
    const names = plan.months.map((m) => m.month)
    expect(names).not.toContain(7)
    expect(names).not.toContain(8)
    expect(names).not.toContain(1) // January is the winter break in this test calendar
  })

  it('numbers lessons sequentially and totals match', () => {
    const plan = generatePlan(monToThu, baseCalendar)
    plan.lessons.forEach((l, i) => expect(l.index).toBe(i))
    expect(plan.semesterTotals[1] + plan.semesterTotals[2]).toBe(plan.total)
    expect(plan.months.reduce((sum, m) => sum + m.total, 0)).toBe(plan.total)
  })
})

describe('themes', () => {
  it('matches themes to lessons by index and keeps leftovers unassigned', () => {
    const plan = generatePlan([{ weekday: 1, hours: 1 }], {
      ...baseCalendar,
      semester1: { start: '2026-09-01', end: '2026-09-14' }, // Mondays: Sep 7, 14
      semester2: { start: '2027-02-01', end: '2027-02-01' }, // Monday Feb 1
    })
    expect(plan.total).toBe(3)
    const themes = ['A', 'B', 'C', 'D', '  ']
    expect(themeFor(themes, plan.lessons[1])).toBe('B')
    expect(themeFor(['A'], plan.lessons[2])).toBe('')
    expect(unassignedThemes(themes, plan)).toEqual(['D'])
  })
})
