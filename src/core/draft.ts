import { parseProject } from './project'
import type { ProjectData } from './project'

/**
 * Automatic draft of the plan, kept in the browser (localStorage) so that closing the tab or a
 * crash does not lose the work. It lives only in this browser on this computer; nothing is sent
 * anywhere. It is removed as soon as the plan is saved to a file.
 */

/** Where the draft lives in the browser's storage. */
export const DRAFT_KEY = 'nastavni-planer-draft'

export interface Draft {
  /** ISO time of the last automatic save */
  savedAt: string
  project: ProjectData
}

/** The browser's storage, or null when it is not available (for example some private modes). */
function defaultStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}

/** Returns false when the draft could not be stored (storage full, blocked...). */
export function writeDraft(project: ProjectData, storage: Storage | null = defaultStorage(), now = new Date()): boolean {
  if (!storage) return false
  try {
    storage.setItem(DRAFT_KEY, JSON.stringify({ savedAt: now.toISOString(), project }))
    return true
  } catch {
    return false
  }
}

export function clearDraft(storage: Storage | null = defaultStorage()): void {
  try {
    storage?.removeItem(DRAFT_KEY)
  } catch {
    // nothing to clean up
  }
}

/**
 * The stored draft, checked the same way as a plan file. A damaged draft, or one made with a
 * calendar this version of the app does not know, is removed and treated as if there were none.
 */
export function readDraft(storage: Storage | null = defaultStorage()): Draft | null {
  if (!storage) return null
  try {
    const raw = storage.getItem(DRAFT_KEY)
    if (raw === null) return null
    const stored = JSON.parse(raw) as { savedAt?: unknown; project?: unknown }
    if (typeof stored.savedAt !== 'string' || Number.isNaN(Date.parse(stored.savedAt))) throw new Error('bad date')
    return { savedAt: stored.savedAt, project: parseProject(JSON.stringify(stored.project)) }
  } catch {
    clearDraft(storage)
    return null
  }
}
