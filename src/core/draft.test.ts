import { describe, expect, it } from 'vitest'
import { DRAFT_KEY, clearDraft, readDraft, writeDraft } from './draft'
import { createEmptyProject, projectFingerprint } from './project'

/** A stand-in for the browser's localStorage */
function fakeStorage(options: { failOnWrite?: boolean } = {}): Storage {
  const data = new Map<string, string>()
  return {
    get length() { return data.size },
    clear: () => data.clear(),
    getItem: (key: string) => data.get(key) ?? null,
    key: (index: number) => [...data.keys()][index] ?? null,
    removeItem: (key: string) => void data.delete(key),
    setItem: (key: string, value: string) => {
      if (options.failOnWrite) throw new DOMException('full', 'QuotaExceededError')
      data.set(key, value)
    },
  }
}

const sample = () => {
  const p = createEmptyProject()
  p.info.schoolName = 'OŠ Test'
  p.schedule[0].hours = 2
  p.themes = ['Prva', 'Druga']
  return p
}

describe('draft (automatic save in the browser)', () => {
  it('is stored under a key named after the app', () => {
    expect(DRAFT_KEY).toBe('nastavni-planer-draft')
    const storage = fakeStorage()
    writeDraft(sample(), storage)
    expect(storage.getItem(DRAFT_KEY)).not.toBeNull()
    expect(storage.length).toBe(1) // and nothing else is written
  })

  it('stores a plan and gives it back unchanged, with the time of the save', () => {
    const storage = fakeStorage()
    const when = new Date('2026-10-24T12:30:00Z')
    expect(writeDraft(sample(), storage, when)).toBe(true)
    const draft = readDraft(storage)!
    expect(draft.savedAt).toBe(when.toISOString())
    expect(projectFingerprint(draft.project)).toBe(projectFingerprint(sample()))
  })

  it('has nothing to give back when nothing was stored, or after clearing', () => {
    const storage = fakeStorage()
    expect(readDraft(storage)).toBeNull()
    writeDraft(sample(), storage)
    clearDraft(storage)
    expect(readDraft(storage)).toBeNull()
  })

  it('a newer draft replaces the older one', () => {
    const storage = fakeStorage()
    writeDraft(sample(), storage)
    const newer = sample()
    newer.themes = ['Treća']
    writeDraft(newer, storage)
    expect(readDraft(storage)!.project.themes).toEqual(['Treća'])
  })

  it('reports a full or blocked storage instead of crashing', () => {
    expect(writeDraft(sample(), fakeStorage({ failOnWrite: true }))).toBe(false)
    expect(writeDraft(sample(), null)).toBe(false)
    expect(readDraft(null)).toBeNull()
    expect(() => clearDraft(null)).not.toThrow()
  })

  it('throws away a damaged draft', () => {
    const storage = fakeStorage()
    storage.setItem(DRAFT_KEY, '{ this is not json')
    expect(readDraft(storage)).toBeNull()
    expect(storage.length).toBe(0) // and does not keep it around
  })

  it('throws away a draft made with a calendar this version does not know', () => {
    const storage = fakeStorage()
    const plan = sample()
    plan.calendar = { ...plan.calendar, calendarId: 'tk-2099-2100' }
    writeDraft(plan, storage)
    expect(readDraft(storage)).toBeNull()
    expect(storage.length).toBe(0)
  })
})
