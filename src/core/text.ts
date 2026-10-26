/**
 * Cuts a text down to at most `max` characters and adds "..." when something was cut off.
 * The cut can fall in the middle of a word (a very long word with no spaces must not stretch the
 * screen), but never leaves a space in front of the dots: "sample text ..." becomes "sample text...".
 */
export function shortenText(text: string, max: number): string {
  const characters = Array.from(text.trim()) // counts a letter or emoji as one, however it is stored
  if (characters.length <= max) return characters.join('')
  return `${characters.slice(0, max).join('').trimEnd()}...`
}
