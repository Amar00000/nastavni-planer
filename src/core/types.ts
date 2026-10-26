// All dates are stored as ISO strings "YYYY-MM-DD".
// This keeps everything JSON-serializable (needed for save/load)
// and avoids time-zone bugs that come with Date objects.

/** One teaching day in the weekly schedule. weekday: 1 = Monday ... 5 = Friday */
export interface ScheduleEntry {
  weekday: number
  hours: number
}

/** A period (or a single day, start === end) in which no classes are held. */
export interface ClosedPeriod {
  start: string
  end: string
  name: string
}

export interface DateRange {
  start: string
  end: string
}

/**
 * A school day on which the lessons of ANOTHER weekday are taught (Kanton Sarajevo does this to
 * make up for a holiday: e.g. Tuesday 6 October is taught "po rasporedu od ponedjeljka").
 */
export interface ScheduleSwap {
  date: string
  /** The weekday (1 = Monday ... 5 = Friday) that `date` falls on, as printed in the official calendar */
  weekday: number
  /** The weekday whose lessons are taught on that date */
  useWeekday: number
}

/** The school calendar: when teaching happens and when it doesn't. */
export interface SchoolCalendar {
  schoolYear: string // e.g. "2026/2027"
  semester1: DateRange
  semester2: DateRange
  closedPeriods: ClosedPeriod[]
  scheduleSwaps?: ScheduleSwap[]
}

/** One individual class hour (a "slot" that a theme can be assigned to). */
export interface Lesson {
  /** Position in the whole school year, starting at 0. Themes are matched by this index. */
  index: number
  date: string
  semester: 1 | 2
}

export interface WeekPlan {
  /** "Prva sedmica", "Druga sedmica", ... (numbered within the month) */
  label: string
  /** ISO date of the Monday of this week */
  weekStart: string
  lessons: Lesson[]
}

export interface MonthPlan {
  year: number
  /** 1-12 */
  month: number
  /** "Septembar", "Oktobar", ... */
  name: string
  semester: 1 | 2
  weeks: WeekPlan[]
  /** Total lessons in the month */
  total: number
}

export interface YearPlan {
  months: MonthPlan[]
  /** Every lesson of the year in order; lessons[i].index === i */
  lessons: Lesson[]
  semesterTotals: { 1: number; 2: number }
  total: number
}
