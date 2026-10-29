import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  LevelFormat,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextDirection,
  TextRun,
  VerticalAlign,
  WidthType,
} from 'docx'
import type { MonthNote, ProjectData } from '../core/project'
import { monthKey, achievedTotals } from '../core/project'
import { themeFor } from '../core/plan'
import type { MonthPlan, SchoolCalendar, YearPlan } from '../core/types'
import { FONT, GRID_BORDERS, NO_BORDERS, PAGE_HEIGHT, PAGE_WIDTH } from './shared'

const MARGIN_SIDE = 720
const MARGIN_TOP = 540
const MARGIN_BOTTOM = 568
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN_SIDE // 10466

const SMALL = 16 // 8 pt: table headings and footers, as in the original
const GREY = 'A6A6A6'

// Mjesec | Planirano | Ostvareno | Plan nastavnih sadržaja | Napomena  (sums to TEXT_WIDTH)
const COLS = [580, 540, 560, 7786, 1000]

const noSpacing = { before: 0, after: 0 }

// ---------------------------------------------------------------- title page

function titlePage(project: ProjectData, calendar: SchoolCalendar): Table {
  const { info } = project

  // One borderless table acts as a fixed page frame, so every block sits exactly where it
  // should: top (school + city/year), middle (title, vertically centred), bottom (class + teacher).
  // The frame is deliberately about 2000 twips (1.4 in) shorter than the page. Word measures pages
  // slightly differently from other programs, and a frame that fills the page exactly can push
  // its last row onto a second page.
  const topHeight = 2300
  const middleHeight = 7800
  const bottomHeight = 3600
  const noMargins = { top: 0, bottom: 0, left: 0, right: 0 }

  const top = new TableRow({
    height: { value: topHeight, rule: HeightRule.EXACT },
    children: [
      new TableCell({
        columnSpan: 2,
        width: { size: TEXT_WIDTH, type: WidthType.DXA },
        margins: noMargins,
        verticalAlign: VerticalAlign.TOP,
        children: [
          new Paragraph({ spacing: noSpacing, children: [new TextRun(info.schoolName)] }),
          new Paragraph({
            spacing: { before: 160, after: 0 },
            tabStops: [{ type: TabStopType.RIGHT, position: TEXT_WIDTH }],
            children: [new TextRun(info.city), new TextRun({ text: `\tŠkolska ${calendar.schoolYear}. godina` })],
          }),
        ],
      }),
    ],
  })

  const centeredBold = (text: string) =>
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: noSpacing,
      children: [new TextRun({ text, bold: true })],
    })

  const middle = new TableRow({
    height: { value: middleHeight, rule: HeightRule.EXACT },
    children: [
      new TableCell({
        columnSpan: 2,
        width: { size: TEXT_WIDTH, type: WidthType.DXA },
        margins: noMargins,
        verticalAlign: VerticalAlign.CENTER,
        children: [
          centeredBold('GODIŠNJI PLAN NASTAVNIH SADRŽAJA'),
          centeredBold('PO MJESECIMA'),
          centeredBold(info.subject),
        ],
      }),
    ],
  })

  const leftWidth = TEXT_WIDTH - 3600
  const bottom = new TableRow({
    height: { value: bottomHeight, rule: HeightRule.EXACT },
    children: [
      new TableCell({
        width: { size: leftWidth, type: WidthType.DXA },
        margins: { ...noMargins, bottom: 1100 },
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({ spacing: noSpacing, children: [new TextRun(`Razred ${info.grade}`.trimEnd())] }),
          // Same empty fixed-height paragraph as in the teacher cell (without the line), so
          // "Razred" and the teacher's name always sit level, in any program.
          new Paragraph({ spacing: { before: 0, after: 0, line: 700, lineRule: 'exact' }, children: [] }),
        ],
      }),
      new TableCell({
        width: { size: 3600, type: WidthType.DXA },
        margins: { ...noMargins, bottom: 1100 },
        verticalAlign: VerticalAlign.BOTTOM,
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: noSpacing,
            children: [new TextRun(info.teacherName ? `/${info.teacherName}/` : '/\u00A0/')],
          }),
          // An empty paragraph with a fixed height gives room to sign; its bottom border is the line.
          new Paragraph({
            spacing: { before: 0, after: 0, line: 700, lineRule: 'exact' },
            indent: { left: 300, right: 300 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 6, space: 0, color: '000000' } },
            children: [],
          }),
        ],
      }),
    ],
  })

  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftWidth, 3600],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [top, middle, bottom],
  })
}

// ---------------------------------------------------------------- month tables

/** Small centred caps text, used in the rotated and heading cells. */
const smallText = (text: string, extra: { allCaps?: boolean } = {}) =>
  new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: noSpacing,
    children: [new TextRun({ text, size: SMALL, ...extra })],
  })

const rotated = { textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT, verticalAlign: VerticalAlign.CENTER }

function headerRows(): TableRow[] {
  const cell = (
    text: string,
    width: number,
    opts: { rowSpan?: number; columnSpan?: number; rotate?: boolean; shade?: boolean; caps?: boolean } = {},
  ) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      rowSpan: opts.rowSpan,
      columnSpan: opts.columnSpan,
      verticalAlign: VerticalAlign.CENTER,
      ...(opts.rotate ? rotated : {}),
      shading: opts.shade ? { type: ShadingType.CLEAR, color: 'auto', fill: GREY } : undefined,
      children: [smallText(text, { allCaps: opts.caps })],
    })

  return [
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      height: { value: 324, rule: HeightRule.ATLEAST },
      children: [
        cell('Mjesec', COLS[0], { rowSpan: 2, rotate: true, caps: true }),
        cell('Časova', COLS[1] + COLS[2], { columnSpan: 2, caps: true }),
        cell('PLAN NASTAVNIH SADRŽAJA', COLS[3], { rowSpan: 2 }),
        cell('NAPOMENA', COLS[4], { rowSpan: 2 }),
      ],
    }),
    new TableRow({
      tableHeader: true,
      cantSplit: true,
      height: { value: 893, rule: HeightRule.ATLEAST },
      children: [
        cell('Planirano', COLS[1], { rotate: true, shade: true }),
        cell('Ostvareno', COLS[2], { rotate: true, shade: true }),
      ],
    }),
  ]
}

function monthRow(
  month: MonthPlan,
  index: number,
  themes: string[],
  note: MonthNote | undefined,
): TableRow {
  const lessons = month.weeks.flatMap((w) => w.lessons)

  const numberCell = (text: string, width: number) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: GREY },
      children: [
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: noSpacing, children: [new TextRun(text)] }),
      ],
    })

  const themeParagraphs = lessons.length
    ? lessons.map(
        (lesson) =>
          new Paragraph({
            numbering: { reference: 'lessons', level: 0, instance: index },
            spacing: noSpacing,
            children: [new TextRun(themeFor(themes, lesson))],
          }),
      )
    : [new Paragraph({ spacing: noSpacing, children: [] })]

  return new TableRow({
    cantSplit: true,
    height: { value: 2500, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        width: { size: COLS[0], type: WidthType.DXA },
        ...rotated,
        children: [smallText(month.name, { allCaps: true })],
      }),
      numberCell(String(month.total), COLS[1]),
      numberCell(note?.achieved ?? '', COLS[2]),
      new TableCell({
        width: { size: COLS[3], type: WidthType.DXA },
        margins: { top: 120, bottom: 120, left: 100, right: 100 },
        children: themeParagraphs,
      }),
      new TableCell({
        width: { size: COLS[4], type: WidthType.DXA },
        margins: { top: 120, bottom: 120, left: 80, right: 80 },
        children: (note?.remark ?? '')
          .split(/\r?\n/)
          .map((line) => new Paragraph({ spacing: noSpacing, children: [new TextRun({ text: line, size: 20 })] })),
      }),
    ],
  })
}

function semesterTable(
  months: MonthPlan[],
  firstIndex: number,
  themes: string[],
  monthNotes: Record<string, MonthNote>,
): Table {
  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: COLS,
    layout: TableLayoutType.FIXED,
    borders: GRID_BORDERS,
    rows: [
      ...headerRows(),
      ...months.map((m, i) => monthRow(m, firstIndex + i, themes, monthNotes[monthKey(m)])),
    ],
  })
}

// ---------------------------------------------------------------- footers under the tables

function footers(plan: YearPlan, monthNotes: Record<string, MonthNote>): Paragraph[] {
  const achieved = achievedTotals(plan, monthNotes)
  const value = (n: number | null, blank = '_______') => (n === null ? blank : String(n))
  // The "Ostvareno" part starts at a tab stop, so it lines up between the two semester lines.
  const line = (text: string, tab: string, tabPosition: number) =>
    new Paragraph({
      spacing: noSpacing,
      tabStops: [{ type: TabStopType.LEFT, position: tabPosition }],
      children: [new TextRun({ text: `${text}\t${tab}`, size: SMALL })],
    })

  return [
    new Paragraph({ spacing: noSpacing, children: [] }),
    line(`Planirano časova u I polugodištu : ${plan.semesterTotals[1]}`, `Ostvareno: ${value(achieved[1])}`, 3800),
    line(`Planirano časova u II polugodištu : ${plan.semesterTotals[2]}`, `Ostvareno: ${value(achieved[2])}`, 3800),
    new Paragraph({ spacing: noSpacing, children: [] }),
    line(
      `Planirano časova u toku školske godine : ${plan.total}`,
      `Ostvareno časova u toku školske godine : ${value(achieved.year, '____________')}`,
      5600,
    ),
  ]
}

// ---------------------------------------------------------------- the document

export function buildYearlyDocument(
  project: ProjectData,
  calendar: SchoolCalendar,
  plan: YearPlan,
): Document {
  const pageProps = {
    page: {
      size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
      margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_SIDE, right: MARGIN_SIDE, header: 300, footer: 300 },
    },
  }

  const first = plan.months.filter((m) => m.semester === 1)
  const second = plan.months.filter((m) => m.semester === 2)

  const tables: (Table | Paragraph)[] = []
  if (first.length) tables.push(semesterTable(first, 0, project.themes, project.monthNotes))
  if (first.length && second.length) {
    // second semester starts on a new page, like the original
    tables.push(
      new Paragraph({
        spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' },
        children: [new PageBreak()],
      }),
    )
  }
  if (second.length) tables.push(semesterTable(second, first.length, project.themes, project.monthNotes))

  return new Document({
    creator: 'Nastavni planer',
    title: `Godišnji plan nastavnih sadržaja ${calendar.schoolYear}`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
          paragraph: { spacing: { before: 0, after: 0, line: 240 } },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'lessons',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: pageProps,
        // the frame fills the page, so the paragraph Word requires after a table is made tiny
        children: [
          titlePage(project, calendar),
          new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, run: { size: 2 }, children: [] }),
        ],
      },
      {
        properties: pageProps,
        children: [...tables, ...footers(plan, project.monthNotes)],
      },
    ],
  })
}
