import { beforeEach, describe, expect, it } from 'vitest'
import { beregnManglendePerioder, genererPerioder } from '@/composables/useRecurringTransactions'
import { nulstilDatabase, ventPaa } from './setup/testDb'

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
      '2026-01-01',
      '2026-04-01',
      '2026-07-01',
    ])
    expect(genererPerioder({ ...husleje, hyppighed: 'aarlig', startDato: '2024-01-01' }, '2026-08-01')).toEqual([
      '2024-01-01',
      '2025-01-01',
      '2026-01-01',
    ])
  })
})

describe('beregnManglendePerioder', () => {
  it('udelader perioder der allerede har en matchende postering', () => {
    const transactions = [{ type: 'indtaegt', kategori: 'husleje', dato: '2026-02-05', belob: 8000 }]

    expect(beregnManglendePerioder({ template: husleje, transactions, tilDato: '2026-03-01' })).toEqual([
      '2026-01-01',
      '2026-03-01',
    ])
  })

  it('matcher ikke posteringer af anden type/kategori', () => {
    const transactions = [{ type: 'udgift', kategori: 'husleje', dato: '2026-01-05', belob: 8000 }]

    expect(beregnManglendePerioder({ template: husleje, transactions, tilDato: '2026-01-01' })).toEqual(['2026-01-01'])
  })
})

describe('useRecurringTransactions', () => {
  let db

  beforeEach(async () => {
    ;({ db } = await nulstilDatabase())
  })

  it('indlæser alle skabeloner', async () => {
    await db.recurringTransactions.add({ ejendomId: 1, ...husleje })

    const { useRecurringTransactions } = await import('@/composables/useRecurringTransactions')
    const { templates, loading } = useRecurringTransactions()
    await ventPaa(() => !loading.value)

    expect(templates.value).toHaveLength(1)
  })

  it('tilføjer en skabelon med det aktive ejendomId og genindlæser', async () => {
    localStorage.setItem('lejlighedsudlejning-valgt-ejendom', '3')

    const { useRecurringTransactions } = await import('@/composables/useRecurringTransactions')
    const { templates, loading, addTemplate } = useRecurringTransactions()
    await ventPaa(() => !loading.value)

    await addTemplate(husleje)

    expect(templates.value).toHaveLength(1)
    expect(templates.value[0]).toMatchObject({ ejendomId: 3, kategori: 'husleje' })
  })

  it('sletter en skabelon og genindlæser', async () => {
    const id = await db.recurringTransactions.add({ ejendomId: 1, ...husleje })

    const { useRecurringTransactions } = await import('@/composables/useRecurringTransactions')
    const { templates, loading, deleteTemplate } = useRecurringTransactions()
    await ventPaa(() => !loading.value)

    await deleteTemplate(id)

    expect(templates.value).toEqual([])
  })
})
