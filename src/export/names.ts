import type { MonthPlan, SchoolCalendar } from '../core/types'

/** Turns "Plan 2026/2027" into a safe file name part. */
export const fileSafe = (text: string): string =>
  text.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, '_')

export function yearlyFileName(calendar: SchoolCalendar): string {
  return `Godisnji_plan_${fileSafe(calendar.schoolYear)}.docx`
}

export function monthlyFileName(month: MonthPlan): string {
  return `Mjesecni_plan_${fileSafe(month.name)}_${month.year}.docx`
}
