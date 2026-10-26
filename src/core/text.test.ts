import { describe, expect, it } from 'vitest'
import { shortenText } from './text'

describe('shortenText', () => {
  it('leaves a short text alone, and trims the spaces around it', () => {
    expect(shortenText('Kratka tema', 60)).toBe('Kratka tema')
    expect(shortenText('  Kratka tema  ', 60)).toBe('Kratka tema')
    expect(shortenText('', 60)).toBe('')
  })

  it('a text of exactly the limit is not cut', () => {
    expect(shortenText('abcde', 5)).toBe('abcde')
    expect(shortenText('abcdef', 5)).toBe('abcde...')
  })

  it('cuts one very long word in the middle', () => {
    expect(shortenText('h' + 's'.repeat(200), 10)).toBe('hsssssssss...')
  })

  it('never leaves a space in front of the dots', () => {
    expect(shortenText('sample text that goes on', 12)).toBe('sample text...') // cut right after "text "
    expect(shortenText('abc def ghi', 4)).toBe('abc...')
    expect(shortenText('abc   def', 5)).toBe('abc...') // several spaces
  })

  it('keeps a cut in the middle of a word as it is', () => {
    expect(shortenText('sample text that goes on', 14)).toBe('sample text th...')
  })

  it('does not cut a letter or emoji in half', () => {
    const emoji = '😀'.repeat(10)
    expect(shortenText(emoji, 3)).toBe('😀😀😀...')
    expect(shortenText('čćšđž'.repeat(5), 4)).toBe('čćšđ...')
  })

  it('the result is never longer than the limit plus the three dots', () => {
    for (const text of ['a'.repeat(500), 'ab '.repeat(200), 'x'.repeat(61)]) {
      expect(Array.from(shortenText(text, 60)).length).toBeLessThanOrEqual(63)
    }
  })
})
