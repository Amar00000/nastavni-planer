import {
  AlignmentType,
  Document,
  Header,
  HeightRule,
  PageNumber,
  Paragraph,
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
import type { ProjectData } from '../core/project'
import { weekKey } from '../core/project'
import { themeFor } from '../core/plan'
import type { MonthPlan, SchoolCalendar } from '../core/types'
import { FONT, GRID_BORDERS, NO_BORDERS, PAGE_HEIGHT, PAGE_WIDTH, orBlank, splitLines } from './shared'

const MARGIN_SIDE = 720
const MARGIN_TOP = 560
const MARGIN_BOTTOM = 450
const TEXT_WIDTH = PAGE_WIDTH - 2 * MARGIN_SIDE // 10466

const SIZE = 20 // 10 pt, as in the original

/** Sedmica | Broj časova | Nastavna tema | Tematska jedinica | Ciljevi i zadaci | Očekivani rezultati */
const COLS = [818, 533, 1416, 2199, 2280, 3220]

/** The form number printed in the top right corner. Constant for now. */
const FORM_NUMBER = 'Obrazac broj 16-B-1'

const noSpacing = { before: 0, after: 0 }
const text = (value: string, extra: { underline?: boolean; italics?: boolean } = {}) =>
  new TextRun({
    text: value,
    size: SIZE,
    italics: extra.italics,
    underline: extra.underline ? {} : undefined,
  })

const rotated = { textDirection: TextDirection.BOTTOM_TO_TOP_LEFT_TO_RIGHT, verticalAlign: VerticalAlign.CENTER }

// ---------------------------------------------------------------- heading block

const pageNumber = () => new TextRun({ children: ['(strana ', PageNumber.CURRENT, ')'], size: SIZE })

/** Header for pages 2 and up only. On page 1 the page number is part of the top block. */
function laterPagesHeader(): Header {
  return new Header({
    children: [new Paragraph({ alignment: AlignmentType.RIGHT, spacing: noSpacing, children: [pageNumber()] })],
  })
}

/** Page 1 has no header, so its (empty) header paragraph is made tiny. */
function firstPageHeader(): Header {
  return new Header({
    children: [new Paragraph({ spacing: { before: 0, after: 0, line: 20, lineRule: 'exact' }, run: { size: 2 }, children: [] })],
  })
}

/**
 * The top block: school and city on the left (each with its caption underneath),
 * page number / form number / school year on the right, on the same lines.
 * A borderless two-column table keeps the two sides level and lets long names wrap.
 */
function topBlock(project: ProjectData, calendar: SchoolCalendar): Table {
  const { info } = project
  const leftWidth = 5600
  const rightWidth = TEXT_WIDTH - leftWidth
  const margins = { top: 0, bottom: 0, left: 0, right: 0 }

  const left = (lines: Paragraph[]) =>
    new TableCell({ width: { size: leftWidth, type: WidthType.DXA }, margins, children: lines })
  const right = (lines: Paragraph[]) =>
    new TableCell({ width: { size: rightWidth, type: WidthType.DXA }, margins, children: lines })

  const centered = (children: TextRun[], before = 0) =>
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before, after: 0 }, children })
  const atRight = (children: TextRun[], before = 0) =>
    new Paragraph({ alignment: AlignmentType.RIGHT, spacing: { before, after: 0 }, children })

  const gap = 120 // space between the school block and the city block (same on both sides)

  return new Table({
    width: { size: TEXT_WIDTH, type: WidthType.DXA },
    columnWidths: [leftWidth, rightWidth],
    layout: TableLayoutType.FIXED,
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [
          left([
            centered([text(orBlank(info.schoolName, 30), { underline: true })]),
            centered([text('(Naziv škole)')]),
          ]),
          // Plain text on purpose: Word only fills in page-number fields automatically inside a header
          // or footer. In the body they stay empty ("(strana )"), and this block is always on page 1.
          right([atRight([text('(strana 1)')]), atRight([text(`(${FORM_NUMBER})`)])]),
        ],
      }),
      new TableRow({
        children: [
          left([
            centered([text(orBlank(info.city, 30), { underline: true })], gap),
            centered([text('(Mjesto)')]),
          ]),
          right([atRight([text(`Školska ${calendar.schoolYear}.g.`)], gap)]),
        ],
      }),
    ],
  })
}

function heading(project: ProjectData, calendar: SchoolCalendar, month: MonthPlan): (Paragraph | Table)[] {
  const { info } = project
  return [
    topBlock(project, calendar),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100, after: 140 },
      children: [new TextRun({ text: 'MJESEČNI PLAN RADA', bold: true, size: SIZE })],
    }),
    // subject on the left, class centred, month at the right edge - using tab stops, not spaces
    new Paragraph({
      spacing: { before: 0, after: 140 },
      tabStops: [
        { type: TabStopType.CENTER, position: Math.round(TEXT_WIDTH / 2) },
        { type: TabStopType.RIGHT, position: TEXT_WIDTH },
      ],
      children: [
        text('Nastavni predmet: '),
        text(orBlank(info.subject, 16), { underline: true }),
        text('\tRazred: '),
        text(info.grade),
        text('\tMjesec: '),
        text(month.name),
      ],
    }),
  ]
}

// ---------------------------------------------------------------- table

const lines = (value: string): Paragraph[] =>
  splitLines(value).map((line) => new Paragraph({ spacing: noSpacing, children: [text(line)] }))

function tableRows(project: ProjectData, month: MonthPlan): TableRow[] {
  const headerCell = (label: string, width: number, rotate = false) =>
    new TableCell({
      width: { size: width, type: WidthType.DXA },
      verticalAlign: VerticalAlign.CENTER,
      ...(rotate ? rotated : {}),
      margins: rotate ? { top: 60, bottom: 60, left: 113, right: 113 } : { top: 60, bottom: 60, left: 100, right: 100 },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: noSpacing,
          children: [text(label)],
        }),
      ],
    })

  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    height: { value: 1300, rule: HeightRule.ATLEAST },
    children: [
      headerCell('Sedmica/ datum', COLS[0], true),
      headerCell('Broj časova', COLS[1], true),
      headerCell('Nastavna tema', COLS[2]),
      headerCell('Tematska jedinica', COLS[3]),
      headerCell('Ciljevi i zadaci', COLS[4]),
      headerCell('Očekivani rezultati', COLS[5]),
    ],
  })

  const body = month.weeks.map((week) => {
    const note = project.weekNotes[weekKey(month, week)]
    const margins = { top: 50, bottom: 50, left: 100, right: 100 }
    const cellWidth = (i: number) => ({ size: COLS[i], type: WidthType.DXA })

    const units = week.lessons.map(
      (lesson, i) =>
        new Paragraph({
          spacing: noSpacing,
          children: [text(`${i + 1}. ${themeFor(project.themes, lesson)}`.trimEnd())],
        }),
    )

    return new TableRow({
      cantSplit: true,
      height: { value: 1500, rule: HeightRule.ATLEAST },
      children: [
        new TableCell({
          width: cellWidth(0),
          ...rotated,
          margins: { top: 50, bottom: 50, left: 113, right: 113 },
          children: [
            new Paragraph({ alignment: AlignmentType.CENTER, spacing: noSpacing, children: [text(week.label)] }),
          ],
        }),
        new TableCell({
          width: cellWidth(1),
          verticalAlign: VerticalAlign.CENTER,
          margins,
          children: [
            new Paragraph({
              alignment: AlignmentType.CENTER,
              spacing: noSpacing,
              children: [text(String(week.lessons.length))],
            }),
          ],
        }),
        new TableCell({
          width: cellWidth(2),
          verticalAlign: VerticalAlign.CENTER,
          margins,
          children: lines(note?.topic ?? ''),
        }),
        new TableCell({
          width: cellWidth(3),
          margins,
          children: units.length ? units : [new Paragraph({ spacing: noSpacing, children: [] })],
        }),
        new TableCell({ width: cellWidth(4), margins, children: lines(note?.goals ?? '') }),
        new TableCell({ width: cellWidth(5), margins, children: lines(note?.outcomes ?? '') }),
      ],
    })
  })

  return [header, ...body]
}

// ---------------------------------------------------------------- signatures

function signatures(project: ProjectData): Paragraph[] {
  const { info } = project
  // Each label and the name below it are centred on the same tab stop, so they line up
  // exactly whatever the length of the name: teacher on the left, director on the right.
  const teacherTab = 2000
  const directorTab = 8700
  const tabs = [
    { type: TabStopType.CENTER, position: teacherTab },
    { type: TabStopType.CENTER, position: directorTab },
  ]
  return [
    new Paragraph({
      spacing: { before: 200, after: 0 },
      tabStops: tabs,
      children: [text('\tNastavnik/ca'), text('\tDirektor/ica')],
    }),
    new Paragraph({
      spacing: { before: 60, after: 0 },
      tabStops: tabs,
      children: [
        text('\t'),
        text(orBlank(info.teacherName, 12), { italics: true }),
        text('\t'),
        text(info.directorName.trim() ? info.directorName.trim() : '___________________', { italics: true }),
      ],
    }),
  ]
}

// ---------------------------------------------------------------- the document

export function buildMonthlyDocument(
  project: ProjectData,
  calendar: SchoolCalendar,
  month: MonthPlan,
): Document {
  return new Document({
    creator: 'Nastavni planer',
    title: `Mjesečni plan rada, ${month.name} ${month.year}.`,
    styles: {
      default: {
        document: {
          run: { font: FONT, size: 24 },
          paragraph: { spacing: { before: 0, after: 0, line: 240 } },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
            margin: {
              top: MARGIN_TOP,
              bottom: MARGIN_BOTTOM,
              left: MARGIN_SIDE,
              right: MARGIN_SIDE,
              header: 300,
              footer: 300,
            },
          },
          titlePage: true, // page 1 uses the "first" header, later pages the numbered one
        },
        headers: { first: firstPageHeader(), default: laterPagesHeader() },
        children: [
          ...heading(project, calendar, month),
          new Table({
            width: { size: TEXT_WIDTH, type: WidthType.DXA },
            columnWidths: COLS,
            layout: TableLayoutType.FIXED,
            borders: GRID_BORDERS,
            rows: tableRows(project, month),
          }),
          ...signatures(project),
        ],
      },
    ],
  })
}
