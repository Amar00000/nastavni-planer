import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { saveFile, saveTextFile, saveWordFile } from './files'

/** Stand-ins for the browser, so the "Save as" logic can be tested without one */
let downloads: { href: string; download: string }[]
let picker: ReturnType<typeof vi.fn> | undefined

beforeEach(() => {
  downloads = []
  picker = undefined
  vi.stubGlobal('document', {
    createElement: () => {
      const link = { href: '', download: '', click() { downloads.push({ href: link.href, download: link.download }) } }
      return link
    },
  })
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} })
  vi.stubGlobal('window', {
    get showSaveFilePicker() {
      return picker
    },
  })
})
afterEach(() => vi.unstubAllGlobals())

const writer = () => {
  const written: Blob[] = []
  return { written, handle: { createWritable: async () => ({ write: async (b: Blob) => void written.push(b), close: async () => {} }) } }
}

const options = (produce = async () => new Blob(['sadržaj'])) => ({
  fileName: 'plan.docx',
  description: 'Word dokument (.docx)',
  mime: 'application/test',
  extension: '.docx',
  produce,
})

describe('saveFile', () => {
  it('opens the "Save as" window with the suggested name and file type, and writes the file', async () => {
    const w = writer()
    picker = vi.fn(async () => w.handle)
    expect(await saveFile(options())).toBe('saved')
    expect(picker).toHaveBeenCalledWith({
      suggestedName: 'plan.docx',
      types: [{ description: 'Word dokument (.docx)', accept: { 'application/test': ['.docx'] } }],
    })
    expect(await w.written[0].text()).toBe('sadržaj')
    expect(downloads).toHaveLength(0)
  })

  it('opens the window before building the file', async () => {
    const order: string[] = []
    picker = vi.fn(async () => (order.push('window'), writer().handle))
    await saveFile(options(async () => (order.push('build'), new Blob(['x']))))
    expect(order).toEqual(['window', 'build'])
  })

  it('closing the window means cancelled: nothing is built or downloaded', async () => {
    picker = vi.fn(async () => { throw new DOMException('closed', 'AbortError') })
    const produce = vi.fn(async () => new Blob(['x']))
    expect(await saveFile(options(produce))).toBe('cancelled')
    expect(produce).not.toHaveBeenCalled()
    expect(downloads).toHaveLength(0)
  })

  it('if the window cannot be used, downloads the file instead', async () => {
    picker = vi.fn(async () => { throw new DOMException('blocked', 'SecurityError') })
    expect(await saveFile(options())).toBe('downloaded')
    expect(downloads).toEqual([{ href: 'blob:test', download: 'plan.docx' }])
  })

  it('says why the window was not used, in the browser console', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    picker = vi.fn(async () => { throw new DOMException('blocked', 'SecurityError') })
    await saveFile(options())
    expect(warn).toHaveBeenCalledTimes(1)
    expect((warn.mock.calls[0][1] as DOMException).name).toBe('SecurityError')
    warn.mockRestore()
  })

  it('downloads in browsers that do not have the window', async () => {
    expect(await saveFile(options())).toBe('downloaded')
    expect(downloads).toEqual([{ href: 'blob:test', download: 'plan.docx' }])
  })
})

describe('saveTextFile', () => {
  it('saves a .json file with the text it was given', async () => {
    const w = writer()
    picker = vi.fn(async () => w.handle)
    expect(await saveTextFile('{"a":1}', 'plan-2026-2027.json')).toBe('saved')
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({ suggestedName: 'plan-2026-2027.json', types: [expect.objectContaining({ accept: { 'application/json': ['.json'] } })] }),
    )
    expect(await w.written[0].text()).toBe('{"a":1}')
  })
})

describe('saveWordFile', () => {
  it('opens the window with a .docx name and type before building the document', async () => {
    const order: string[] = []
    picker = vi.fn(async () => (order.push('window'), writer().handle))
    const result = await saveWordFile('Godisnji_plan_2026-2027.docx', async () => (order.push('build'), new Blob(['x'])))
    expect(result).toBe('saved')
    expect(order).toEqual(['window', 'build'])
    expect(picker).toHaveBeenCalledWith(
      expect.objectContaining({
        suggestedName: 'Godisnji_plan_2026-2027.docx',
        types: [expect.objectContaining({ description: 'Word dokument (.docx)' })],
      }),
    )
  })
})
