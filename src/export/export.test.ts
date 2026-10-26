import { describe, expect, it } from 'vitest'
import { Packer } from 'docx'
import { buildCalendar, defaultCalendarChoices } from '../core/calendar'
import { generatePlan } from '../core/plan'
import { createEmptyProject, monthKey, weekKey } from '../core/project'
import { buildMonthlyDocument } from './monthly'
import { buildYearlyDocument } from './yearly'

const TEST_CALENDAR = buildCalendar(defaultCalendarChoices())

function sampleProject() {
  const project = createEmptyProject()
  project.info = {
    schoolName: 'OŠ Test',
    city: 'Tuzla',
    subject: 'Bosanski jezik',
    grade: 'VI',
    teacherName: 'Ime Prezime',
    directorName: 'Direktor Test',
  }
  project.schedule.forEach((e) => {
    if (e.weekday <= 4) e.hours = 1
  })
  const plan = generatePlan(project.schedule, TEST_CALENDAR)
  project.themes = plan.lessons.map((_, i) => `Tema ${i + 1}`)
  return { project, plan }
}

/** A .docx file is a zip archive, which always starts with the bytes "PK". */
const isZip = (buffer: Uint8Array) => buffer[0] === 0x50 && buffer[1] === 0x4b

describe('Word export', () => {
  it('builds the yearly document', async () => {
    const { project, plan } = sampleProject()
    const buffer = await Packer.toBuffer(buildYearlyDocument(project, TEST_CALENDAR, plan))
    expect(isZip(buffer)).toBe(true)
    expect(buffer.length).toBeGreaterThan(5000)
  })

  it('builds every monthly document, including multi-line notes', async () => {
    const { project, plan } = sampleProject()
    const first = plan.months[0]
    project.weekNotes[weekKey(first, first.weeks[0])] = {
      topic: 'Jezik\nKnjiževnost',
      goals: 'prvi red\ndrugi red',
      outcomes: 'rezultat',
    }
    project.monthNotes[monthKey(first)] = { achieved: '17', remark: 'napomena\nu dva reda' }
    for (const month of plan.months) {
      const buffer = await Packer.toBuffer(buildMonthlyDocument(project, TEST_CALENDAR, month))
      expect(isZip(buffer)).toBe(true)
    }
  })

  it('works for a project with no information filled in', async () => {
    const empty = createEmptyProject()
    empty.schedule[0].hours = 2
    const plan = generatePlan(empty.schedule, TEST_CALENDAR)
    expect(isZip(await Packer.toBuffer(buildYearlyDocument(empty, TEST_CALENDAR, plan)))).toBe(true)
    expect(isZip(await Packer.toBuffer(buildMonthlyDocument(empty, TEST_CALENDAR, plan.months[0])))).toBe(true)
  })
})
