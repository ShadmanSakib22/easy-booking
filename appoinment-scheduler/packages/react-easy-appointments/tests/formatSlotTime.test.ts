import { describe, it, expect, afterEach, vi } from 'vitest'
import { formatSlotTime } from '../src/utils/formatSlotTime'

describe('formatSlotTime', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('returns a non-empty local time string in jsdom (window defined)', () => {
    const result = formatSlotTime('2026-05-19T09:00:00Z', 'en-US')
    expect(typeof result).toBe('string')
    expect(result.length).toBeGreaterThan(0)
    expect(result).toMatch(/\d/)
  })

  it('returns empty string when window is undefined (server)', () => {
    vi.stubGlobal('window', undefined)
    const result = formatSlotTime('2026-05-19T09:00:00Z', 'en-US')
    expect(result).toBe('')
  })

  it('uses the provided locale without throwing', () => {
    const result = formatSlotTime('2026-05-19T09:00:00Z', 'fr-FR')
    expect(typeof result).toBe('string')
  })
})
