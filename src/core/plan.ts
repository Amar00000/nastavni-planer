import { addDays, format, getISODay, parseISO, startOfISOWeek } from 'date-fns'
import type {
  DateRange,
  Lesson,
  MonthPlan,
  ScheduleEntry,
  SchoolCalendar,
  WeekPlan,
  YearPlan,
} from './types'

export const MONTH_NAMES = [
  'Januar',
  'Februar',
  'Mart',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'Septembar',
  'Oktobar',
  'Novembar',
  'Decembar',
]

const WEEK_ORDINALS = ['Prva', 'Druga', 'Treća', 'Četvrta', 'Peta', 'Šesta', 'Sedma']

export function weekLabel(position: number): string {
  // position is 0-based
  return `${WEEK_ORDINALS[position] ?? position + 1 + '.'} sedmica`
}

const toIso = (d: Date) => format(d, 'yyyy-MM-dd')

/**
 * Builds the full plan: every lesson of the year, grouped into months and weeks.
 *
 * Rules:
 *  - Only Monday-Friday inside the two semesters are considered school days.
 *  - A day inside a closed period (holiday, break) produces no lessons.
 *  - Weeks run Monday-Sunday. A week that crosses a month boundary appears in
 *    both months, containing only that month's lessons.
 *  - A week with no lessons is still listed (with 0 lessons), as long as it
 *    has at least one weekday inside a semester.
 *  - On a day in calendar.scheduleSwaps the schedule of another weekday applies.
 *  - A month with no lessons at all is left out.
 */
export function generatePlan(schedule: ScheduleEntry[], calendar: SchoolCalendar): YearPlan {
  const hoursByWeekday = new Map<number, number>()
  for (const entry of schedule) {
    hoursByWeekday.set(entry.weekday, (hoursByWeekday.get(entry.weekday) ?? 0) + entry.hours)
  }

  // On a swapped day the lessons of another weekday are taught (see ScheduleSwap)
  const swaps = new Map((calendar.scheduleSwaps ?? []).map((swap) => [swap.date, swap.useWeekday]))

  const isClosed = (date: string) =>
    calendar.closedPeriods.some((p) => date >= p.start && date <= p.end)

  const lessons: Lesson[] = []
  const monthMap = new Map<string, MonthPlan>() // key "YYYY-MM"

  const semesters: [1 | 2, DateRange][] = [
    [1, calendar.semester1],
    [2, calendar.semester2],
  ]

  for (const [semester, range] of semesters) {
    const end = parseISO(range.end)
    for (let day = parseISO(range.start); day <= end; day = addDays(day, 1)) {
      const weekday = getISODay(day) // 1 = Monday ... 7 = Sunday
      if (weekday > 5) continue

      const date = toIso(day)
      const monthKey = date.slice(0, 7)

      let month = monthMap.get(monthKey)
      if (!month) {
        const monthNumber = day.getMonth() + 1
        month = {
          year: day.getFullYear(),
          month: monthNumber,
          name: MONTH_NAMES[monthNumber - 1],
          semester, // semester of the month's first school day
          weeks: [],
          total: 0,
        }
        monthMap.set(monthKey, month)
      }

      // Find or create this week inside the month (even if it ends up with 0 lessons)
      const weekStart = toIso(startOfISOWeek(day))
      let week: WeekPlan | undefined = month.weeks.find((w) => w.weekStart === weekStart)
      if (!week) {
        week = { label: weekLabel(month.weeks.length), weekStart, lessons: [] }
        month.weeks.push(week)
      }

      if (isClosed(date)) continue
      const hours = hoursByWeekday.get(swaps.get(date) ?? weekday) ?? 0
      for (let h = 0; h < hours; h++) {
        const lesson: Lesson = { index: lessons.length, date, semester }
        lessons.push(lesson)
        week.lessons.push(lesson)
        month.total++
      }
    }
  }

  // A month without a single lesson has nothing to plan, so it is left out (for example January
  // for a Monday-Thursday schedule, when the only school day of the month is a Friday).
  const months = [...monthMap.values()]
    .filter((m) => m.total > 0)
    .sort((a, b) => a.year - b.year || a.month - b.month)

  const semesterTotals = {
    1: lessons.filter((l) => l.semester === 1).length,
    2: lessons.filter((l) => l.semester === 2).length,
  }

  return { months, lessons, semesterTotals, total: lessons.length }
}

/** The theme for a lesson. Themes are stored as one flat list, matched by lesson index. */
export function themeFor(themes: string[], lesson: Lesson): string {
  return themes[lesson.index] ?? ''
}

/**
 * Themes that no longer have a lesson slot (e.g. after the schedule shrank).
 * The UI can show these so the user's typed work is never silently lost.
 */
export function unassignedThemes(themes: string[], plan: YearPlan): string[] {
  return themes.slice(plan.total).filter((t) => t.trim() !== '')
}
