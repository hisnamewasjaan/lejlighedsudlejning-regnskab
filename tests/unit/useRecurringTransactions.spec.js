import { describe, expect, it } from 'vitest'
import { beregnManglendePerioder, genererPerioder } from '@/composables/useRecurringTransactions'

const husleje = {
  type: 'indtaegt',
  kategori: 'husleje',
  hyppighed: 'maanedlig',
  startDato: '2026-01-01',
  slutDato: '',
}

describe('genererPerioder', () => {
  it('genererer en periode pr. måned frem til og med tilDato', () => {
    expect(genererPerioder(husleje, '2026-03-15')).toEqual(['2026-01-01', '2026-02-01', '2026-03-01'])
  })

  it('stopper ved skabelonens slutDato hvis den ligger før tilDato', () => {
    const template = { ...husleje, slutDato: '2026-02-01' }
    expect(genererPerioder(template, '2026-06-01')).toEqual(['2026-01-01', '2026-02-01'])
  })

  it('understøtter kvartalsvis og årlig hyppighed', () => {
    expect(genererPerioder({ ...husleje, hyppighed: 'kvartalsvis' }, '2026-08-01')).toEqual([
      '2026-01-01', '2026-04-01', '2026-07-01',
    ])
    expect(genererPerioder({ ...husleje, hyppighed: 'aarlig', startDato: '2024-01-01' }, '2026-08-01')).toEqual([
      '2024-01-01', '2025-01-01', '2026-01-01',
    ])
  })
})

describe('beregnManglendePerioder', () => {
  it('udelader perioder der allerede har en matchende postering', () => {
    const transactions = [{ type: 'indtaegt', kategori: 'husleje', dato: '2026-02-05', belob: 8000 }]

    expect(beregnManglendePerioder({ template: husleje, transactions, tilDato: '2026-03-01' })).toEqual([
      '2026-01-01', '2026-03-01',
    ])
  })

  it('matcher ikke posteringer af anden type/kategori', () => {
    const transactions = [{ type: 'udgift', kategori: 'husleje', dato: '2026-01-05', belob: 8000 }]

    expect(beregnManglendePerioder({ template: husleje, transactions, tilDato: '2026-01-01' })).toEqual([
      '2026-01-01',
    ])
  })
})
