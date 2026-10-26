import { BorderStyle, Packer } from 'docx'
import type { Document } from 'docx'

export const FONT = 'Times New Roman'

/** A4 portrait, in twips (1/20 pt). Both documents use A4, the paper size used in BiH. */
export const PAGE_WIDTH = 11906
export const PAGE_HEIGHT = 16838

const BLACK = '000000'
export const THICK = { style: BorderStyle.SINGLE, size: 12, color: BLACK }
export const THIN = { style: BorderStyle.SINGLE, size: 4, color: BLACK }
export const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' }

/** Thick outer frame, thin inner grid - as in the original documents. */
export const GRID_BORDERS = {
  top: THICK,
  bottom: THICK,
  left: THICK,
  right: THICK,
  insideHorizontal: THIN,
  insideVertical: THIN,
}

export const NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
}

/** Word paragraphs can't contain line breaks, so multi-line text becomes several paragraphs. */
export const splitLines = (text: string): string[] => text.split(/\r?\n/)

/**
 * Returns the text, or a run of non-breaking spaces when it is empty.
 * Used for underlined values so an empty field still leaves a visible blank line to write on.
 */
export const orBlank = (text: string, width = 24): string =>
  text.trim() ? text.trim() : '\u00A0'.repeat(width)

/** The Word file's content, ready to be written to disk. */
export function documentToBlob(doc: Document): Promise<Blob> {
  return Packer.toBlob(doc)
}
