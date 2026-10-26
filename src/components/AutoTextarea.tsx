import type { TextareaHTMLAttributes } from 'react'

/**
 * A text box that fills its table cell. The cell (and therefore the whole table row)
 * is sized by a hidden copy of the text, so:
 *  - the box grows as text is typed,
 *  - every box in a row ends up as tall as the tallest content in that row,
 *  - it cannot be resized by hand.
 * The parent <td> must have position: relative (see .edit-cell in index.css).
 */
export function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const text = String(props.value ?? '')
  return (
    <>
      {/* The zero-width space makes a trailing line break take up a line */}
      <div className="grow-mirror" aria-hidden="true">
        {text + '\u200b'}
      </div>
      <textarea className="grow-textarea" {...props} />
    </>
  )
}
