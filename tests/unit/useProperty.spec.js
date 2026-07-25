import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { nulstilDatabase, ventPaa } from './setup/testDb'

let db
let useProperty

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
  ;({ useProperty } = await import('@/composables/useProperty'))
})

describe('useProperty', () => {
  it('returnerer null når intet ejendomId er givet', async () => {
    const { property, loading } = useProperty(null)
    await ventPaa(() => !loading.value)
    expect(property.value).toBeNull()
  })

  it('indlæser ejendommen for det givne id', async () => {
    const id = await db.property.add({ adresse: 'Testvej 1', bfeNr: '123' })

    const { property, loading } = useProperty(id)
    await ventPaa(() => !loading.value)

    expect(property.value).toMatchObject({ id, adresse: 'Testvej 1', bfeNr: '123' })
  })

  it('returnerer null hvis ejendomId ikke findes i databasen', async () => {
    const { property, loading } = useProperty(999)
    await ventPaa(() => !loading.value)

    expect(property.value).toBeNull()
  })

  it('gemmer ændringer og genindlæser', async () => {
    const id = await db.property.add({ adresse: 'Testvej 1', bfeNr: '123' })
    const { property, loading, save } = useProperty(id)
    await ventPaa(() => !loading.value)

    await save({ adresse: 'Nyvej 2' })

    expect(property.value.adresse).toBe('Nyvej 2')
    expect((await db.property.get(id)).adresse).toBe('Nyvej 2')
  })

  it('ignorerer save når der ikke er en indlæst ejendom', async () => {
    const { property, loading, save } = useProperty(null)
    await ventPaa(() => !loading.value)

    await save({ adresse: 'Nyvej 2' })

    expect(property.value).toBeNull()
    expect(await db.property.count()).toBe(0)
  })

  it('genindlæser reaktivt når et ref-baseret ejendomId ændrer sig', async () => {
    const idA = await db.property.add({ adresse: 'A-vej 1' })
    const idB = await db.property.add({ adresse: 'B-vej 2' })
    const ejendomId = ref(idA)

    const { property, loading } = useProperty(ejendomId)
    await ventPaa(() => !loading.value)
    expect(property.value.adresse).toBe('A-vej 1')

    ejendomId.value = idB
    await ventPaa(() => property.value?.adresse === 'B-vej 2')
  })
})
