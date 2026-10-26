import { useEffect, useId, useRef, useState } from 'react'

export interface DialogButton {
  id: string
  label: string
  /** "primary" is the suggested answer, "danger" throws something away */
  kind?: 'primary' | 'danger'
  /** The button that has the keyboard focus when the dialog opens. Choose the safest one. */
  autoFocus?: boolean
}

export interface DialogCheckbox {
  label: string
  checked: boolean
  hint?: string
}

export interface DialogConfig {
  title: string
  message: string
  checkbox?: DialogCheckbox
  /** In the order they are shown, left to right */
  buttons: DialogButton[]
  /** The answer when the dialog is closed with Escape or by clicking outside it */
  cancelId: string
}

export interface DialogResult {
  /** The id of the chosen button */
  choice: string
  /** The state of the checkbox, false when there is none */
  checked: boolean
}

interface Props {
  config: DialogConfig
  onResult: (result: DialogResult) => void
}

/**
 * Our own replacement for the browser's alert/confirm boxes. It can have any number of buttons and
 * a checkbox, looks the same everywhere, and works the same inside the packaged desktop app.
 * It is a native <dialog>, so focus stays inside it and Escape closes it.
 */
export function Dialog({ config, onResult }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const answered = useRef(false)
  const titleId = useId()
  const messageId = useId()
  const [checked, setChecked] = useState(config.checkbox?.checked ?? false)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (!dialog.open) dialog.showModal()
    dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
  }, [])

  const answer = (choice: string) => {
    if (answered.current) return // ignore a second click while the dialog closes
    answered.current = true
    onResult({ choice, checked })
  }

  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onCancel={(e) => {
        e.preventDefault() // Escape: answer "cancel" ourselves
        answer(config.cancelId)
      }}
      onClick={(e) => {
        // a click on the dimmed area outside the box counts as "cancel"
        if (e.target === ref.current) answer(config.cancelId)
      }}
    >
      <div className="dialog-body">
        <h2 id={titleId}>{config.title}</h2>
        <p id={messageId}>{config.message}</p>

        {config.checkbox && (
          <label className="dialog-check">
            <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
            <span>
              {config.checkbox.label}
              {config.checkbox.hint && <small>{config.checkbox.hint}</small>}
            </span>
          </label>
        )}

        <div className="dialog-buttons">
          {config.buttons.map((b) => (
            <button
              key={b.id}
              type="button"
              className={b.kind ?? ''}
              data-autofocus={b.autoFocus ? '' : undefined}
              onClick={() => answer(b.id)}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
    </dialog>
  )
}
