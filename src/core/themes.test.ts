import { describe, expect, it } from 'vitest'
import { hasThemeFrom, moveTheme, movedIndex, removeThemeAt } from './themes'

const list = () => ['A', 'B', 'C', 'D', 'E']

describe('removeThemeAt', () => {
  it('takes the theme out and moves everything after it up', () => {
    expect(removeThemeAt(list(), 1)).toEqual(['A', 'C', 'D', 'E'])
    expect(removeThemeAt(list(), 0)).toEqual(['B', 'C', 'D', 'E'])
    expect(removeThemeAt(list(), 4)).toEqual(['A', 'B', 'C', 'D'])
  })

  it('an empty lesson in the middle can be removed too, and the themes after it move up', () => {
    expect(removeThemeAt(['A', '', 'C'], 1)).toEqual(['A', 'C'])
  })

  it('does nothing for a lesson beyond the end of the list', () => {
    expect(removeThemeAt(list(), 9)).toEqual(list())
    expect(removeThemeAt(list(), -1)).toEqual(list())
  })

  it('brings themes that had no lesson back into the plan', () => {
    // 3 lessons, 5 themes: D and E were waiting without a lesson
    const after = removeThemeAt(list(), 0)
    expect(after.slice(0, 3)).toEqual(['B', 'C', 'D'])
  })

  it('does not change the list it was given', () => {
    const original = list()
    removeThemeAt(original, 2)
    expect(original).toEqual(list())
  })
})

describe('hasThemeFrom', () => {
  it('is true while a theme exists at or after the lesson', () => {
    expect(hasThemeFrom(['A', '', 'C'], 1)).toBe(true)
    expect(hasThemeFrom(['A', '', ''], 1)).toBe(false)
    expect(hasThemeFrom(['A'], 5)).toBe(false)
    expect(hasThemeFrom([], 0)).toBe(false)
  })
})

describe('moveTheme', () => {
  it('moves a theme far down: others shift up by one in between', () => {
    // theme at lesson 1 into the gap in front of lesson 4: it becomes lesson 3
    expect(moveTheme(list(), 1, 4)).toEqual(['A', 'C', 'D', 'B', 'E'])
  })

  it('moves a theme far up: others shift down by one in between', () => {
    // theme at lesson 4 into the gap in front of lesson 1: it becomes lesson 1
    expect(moveTheme(list(), 4, 1)).toEqual(['A', 'E', 'B', 'C', 'D'])
  })

  it('the very first and the very last gap work', () => {
    expect(moveTheme(list(), 3, 0)).toEqual(['D', 'A', 'B', 'C', 'E'])
    expect(moveTheme(list(), 1, 5)).toEqual(['A', 'C', 'D', 'E', 'B'])
  })

  it('one step up and one step down are swaps with the neighbour', () => {
    expect(moveTheme(list(), 2, 1)).toEqual(['A', 'C', 'B', 'D', 'E']) // up
    expect(moveTheme(list(), 2, 4)).toEqual(['A', 'B', 'D', 'C', 'E']) // down
  })

  it('does nothing when dropped next to where it already is', () => {
    expect(moveTheme(list(), 2, 2)).toEqual(list())
    expect(moveTheme(list(), 2, 3)).toEqual(list())
  })

  it('never loses or duplicates a theme', () => {
    for (let from = 0; from < 5; from++) {
      for (let before = 0; before <= 5; before++) {
        expect(moveTheme(list(), from, before).slice().sort()).toEqual(list())
      }
    }
  })

  it('puts the theme exactly where movedIndex says', () => {
    for (let from = 0; from < 5; from++) {
      for (let before = 0; before <= 5; before++) {
        const result = moveTheme(list(), from, before)
        expect(result[movedIndex(from, before)]).toBe(list()[from])
      }
    }
  })

  it('works when the list is shorter than the lessons (lessons without a theme are empty)', () => {
    // only two themes typed, the teacher moves the first into the gap in front of lesson 5
    expect(moveTheme(['A', 'B'], 0, 5)).toEqual(['B', '', '', '', 'A'])
    // moving an empty lesson counts too
    expect(moveTheme(['A'], 3, 0)).toEqual(['', 'A', '', ''])
  })

  it('keeps themes that have no lesson yet, pushing them further down', () => {
    // 3 lessons, 5 themes. A theme moved up into lesson 1 pushes the others down, not away.
    expect(moveTheme(list(), 2, 0)).toEqual(['C', 'A', 'B', 'D', 'E'])
  })

  it('does not change the list it was given', () => {
    const original = list()
    moveTheme(original, 0, 4)
    expect(original).toEqual(list())
  })
})
