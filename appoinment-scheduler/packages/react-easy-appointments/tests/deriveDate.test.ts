import { describe, it, expect } from 'vitest'
import { deriveDate } from '../src/utils/deriveDate'

describe('deriveDate', () => {
  it('extracts the UTC date portion', () => {
    expect(deriveDate('2026-05-19T09:00:00Z')).toBe('2026-05-19')
  })

  it('extracts UTC date for a late-night UTC slot (no local shift)', () => {
    // Proves it uses string slice, not a Date object that would shift by timezone
    expect(deriveDate('2026-05-19T23:30:00Z')).toBe('2026-05-19')
  })

  it('handles a midnight UTC timestamp', () => {
    expect(deriveDate('2026-12-31T00:00:00Z')).toBe('2026-12-31')
  })
})
