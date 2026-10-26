/**
 * Editing the list of themes. The yearly plan keeps one flat list: themes[0] belongs to the first
 * lesson of the year, themes[1] to the second, and so on. Removing or moving a theme therefore
 * shifts the themes after it, across month boundaries, exactly as the teacher sees in the table.
 * Every function returns a new list and leaves the one it was given untouched.
 */

/** True when there is a theme at this lesson or after it, so that removing it changes something. */
export function hasThemeFrom(themes: string[], index: number): boolean {
  return themes.slice(index).some((t) => t.trim() !== '')
}

/**
 * Takes the theme at `index` out of the list; every theme after it moves up by one lesson.
 * The last lesson is left without a theme.
 */
export function removeThemeAt(themes: string[], index: number): string[] {
  const next = [...themes]
  if (index >= 0 && index < next.length) next.splice(index, 1)
  return next
}

/**
 * Where a theme ends up after moving it from `from` to the gap in front of lesson `insertBefore`
 * (the gaps are numbered like the lessons: 0 is in front of the first lesson, and the number of
 * lessons is the gap after the last one).
 */
export function movedIndex(from: number, insertBefore: number): number {
  return insertBefore > from ? insertBefore - 1 : insertBefore
}

/**
 * Moves the theme at `from` into the gap in front of lesson `insertBefore`. The themes in between
 * shift by one lesson to make room, and the number of themes stays the same.
 * Moving a theme to the gap right in front of it or right behind it changes nothing.
 */
export function moveTheme(themes: string[], from: number, insertBefore: number): string[] {
  const next = [...themes]
  if (from < 0 || insertBefore < 0 || insertBefore === from || insertBefore === from + 1) return next

  while (next.length <= from) next.push('') // a lesson that has no theme yet is an empty one
  const [item] = next.splice(from, 1)
  const target = movedIndex(from, insertBefore)
  while (next.length < target) next.push('')
  next.splice(target, 0, item)
  return next
}
