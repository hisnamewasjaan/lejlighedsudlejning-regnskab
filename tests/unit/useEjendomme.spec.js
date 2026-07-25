import { beforeEach, describe, expect, it } from 'vitest'
import { nulstilDatabase, ventPaa } from './setup/testDb'

let db

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
})

// useEjendomme() indlæser allerede ved import (modul-singleton, se useEjendomme.js), så
// forudsætningsdata i db skal oprettes FØR modulet importeres i den enkelte test - ellers ser
// modulets eget indledende load() en tom property-tabel.

describe('useEjendomme', () => {
  it('indlæser ejendomme sorteret efter adresse', async () => {
    await db.property.bulkAdd([{ adresse: 'B-vej 2' }, { adresse: 'A-vej 1' }])

    const { useEjendomme } = await import('@/composables/useEjendomme')
    const { ejendomme, loading } = useEjendomme()
    await ventPaa(() => !loading.value)

    expect(ejendomme.value.map((e) => e.adresse)).toEqual(['A-vej 1', 'B-vej 2'])
  })

  it('vælger automatisk den første ejendom, hvis ingen er valgt endnu (migrering fra én-ejendom)', async () => {
    const id = await db.property.add({ adresse: 'Eneste vej 1' })

    const { useEjendomme } = await import('@/composables/useEjendomme')
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    const { loading } = useEjendomme()
    await ventPaa(() => !loading.value)

    expect(useValgtEjendom().value).toBe(id)
  })

  it('ændrer ikke et allerede valgt ejendomId', async () => {
    await db.property.bulkAdd([{ adresse: 'A-vej 1' }, { adresse: 'B-vej 2' }])
    localStorage.setItem('lejlighedsudlejning-valgt-ejendom', '42')

    const { useEjendomme } = await import('@/composables/useEjendomme')
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    const { loading } = useEjendomme()
    await ventPaa(() => !loading.value)

    expect(useValgtEjendom().value).toBe(42)
  })

  it('tilføjer en ejendom, genindlæser og vælger den', async () => {
    const { useEjendomme } = await import('@/composables/useEjendomme')
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    const { ejendomme, loading, addEjendom } = useEjendomme()
    await ventPaa(() => !loading.value)

    const id = await addEjendom({ adresse: 'Ny Ejendomsvej 3' })

    expect(ejendomme.value).toHaveLength(1)
    expect(useValgtEjendom().value).toBe(id)
  })
})
