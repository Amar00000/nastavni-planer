/**
 * Saving a file to the teacher's computer.
 *
 * Chrome and Edge can show the normal "Save as" window, where she picks the folder and the name.
 * Other browsers (Firefox, Safari) cannot, so there the file goes straight to the Downloads folder.
 */

export type SaveResult =
  /** Written through the "Save as" window */
  | 'saved'
  /** The teacher closed the "Save as" window without saving */
  | 'cancelled'
  /** Sent to the browser's downloads (no "Save as" window available) */
  | 'downloaded'

interface SaveFilePickerOptions {
  suggestedName?: string
  types?: { description?: string; accept: Record<string, string[]> }[]
}

interface PickerHandle {
  createWritable(): Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>
}

type PickerWindow = Window & {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<PickerHandle>
}

function download(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}

export interface SaveFileOptions {
  fileName: string
  /** Shown in the "Save as" window, e.g. "Word dokument (.docx)" */
  description: string
  mime: string
  /** With the dot, e.g. ".docx" */
  extension: string
  /**
   * Builds the content of the file. It runs after the "Save as" window has been answered, so the
   * window opens right after the click, however long building the file takes.
   */
  produce: () => Promise<Blob>
}

export async function saveFile(options: SaveFileOptions): Promise<SaveResult> {
  const win = window as PickerWindow

  if (typeof win.showSaveFilePicker === 'function') {
    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: options.fileName,
        types: [{ description: options.description, accept: { [options.mime]: [options.extension] } }],
      })
      const blob = await options.produce()
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return 'saved'
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'
      // Any other problem (the window was blocked, no permission...): use a normal download instead.
      // The reason is written to the browser console, to make a missing window easy to explain.
      console.warn('Prozor „Spremi kao“ nije mogao biti otvoren, koristi se običan download:', error)
    }
  }

  download(await options.produce(), options.fileName)
  return 'downloaded'
}

/** The plan file (.json) */
export function saveTextFile(text: string, fileName: string): Promise<SaveResult> {
  return saveFile({
    fileName,
    description: 'Nastavni planer (.json)',
    mime: 'application/json',
    extension: '.json',
    produce: async () => new Blob([text], { type: 'application/json' }),
  })
}

/** A Word file (.docx). The content is built only after the "Save as" window has been answered. */
export function saveWordFile(fileName: string, produce: () => Promise<Blob>): Promise<SaveResult> {
  return saveFile({
    fileName,
    description: 'Word dokument (.docx)',
    mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    extension: '.docx',
    produce,
  })
}
