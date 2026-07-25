import { beforeEach, describe, expect, it } from 'vitest'
import { nulstilDatabase, ventPaa } from './setup/testDb'

let db

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
})

// useTransactions() indlæser allerede ved import (modul-singleton), så forudsætningsdata i db skal
// oprettes FØR modulet importeres i den enkelte test - se samme bemærkning i useEjendomme.spec.js.

describe('useTransactions', () => {
  it('indlæser posteringer, nyeste dato først', async () => {
    await db.transactions.bulkAdd([
      { ejendomId: 1, type: 'indtaegt', kategori: 'husleje', dato: '2026-01-01', belob: 8000 },
      { ejendomId: 1, type: 'indtaegt', kategori: 'husleje', dato: '2026-03-01', belob: 8000 },
    ])

    const { useTransactions } = await import('@/composables/useTransactions')
    const { transactions, loading } = useTransactions()
    await ventPaa(() => !loading.value)

    expect(transactions.value.map((t) => t.dato)).toEqual(['2026-03-01', '2026-01-01'])
  })

  it('tilføjer en postering med det aktive ejendomId og genindlæser', async () => {
    localStorage.setItem('lejlighedsudlejning-valgt-ejendom', '7')

    const { useTransactions } = await import('@/composables/useTransactions')
    const { transactions, loading, addTransaction } = useTransactions()
    await ventPaa(() => !loading.value)

    await addTransaction({ type: 'udgift', kategori: 'forsikring', dato: '2026-02-01', belob: 500 })

    expect(transactions.value).toHaveLength(1)
    expect(transactions.value[0]).toMatchObject({ ejendomId: 7, kategori: 'forsikring' })
  })

  it('sletter en postering og genindlæser', async () => {
    const id = await db.transactions.add({
      ejendomId: 1,
      type: 'udgift',
      kategori: 'forsikring',
      dato: '2026-02-01',
      belob: 500,
    })

    const { useTransactions } = await import('@/composables/useTransactions')
    const { transactions, loading, deleteTransaction } = useTransactions()
    await ventPaa(() => !loading.value)

    await deleteTransaction(id)

    expect(transactions.value).toEqual([])
  })
})
