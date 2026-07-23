import { describe, expect, it } from 'vitest'
import { formatKr, formatPct, formatTal } from '@/utils/format'

describe('formatTal', () => {
  it('bruger dansk talnotation: "." som tusindtalsseparator og "," som decimaltegn', () => {
    expect(formatTal(1_234_567.89)).toBe('1.234.567,89')
  })

  it('behandler null/undefined som 0', () => {
    expect(formatTal(null)).toBe('0')
    expect(formatTal(undefined)).toBe('0')
  })

  it('viser aldrig "-0" ved negativ nul', () => {
    expect(formatTal(0 - 0)).toBe('0')
    expect(formatTal(-0)).toBe('0')
  })
})

describe('formatKr', () => {
  it('tilføjer "kr." efter det formaterede tal', () => {
    expect(formatKr(12_345.67)).toBe('12.345,67 kr.')
  })
})

describe('formatPct', () => {
  it('tilføjer "%" efter det formaterede tal', () => {
    expect(formatPct(2.5)).toBe('2,5%')
  })
})
