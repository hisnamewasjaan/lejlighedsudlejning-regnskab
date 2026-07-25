import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { nulstilDatabase, ventPaa } from './setup/testDb'

let db
let useTenants

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
  ;({ useTenants } = await import('@/composables/useTenants'))
})

describe('useTenants', () => {
  it('returnerer tom liste når intet ejendomId er givet', async () => {
    const { tenants, loading } = useTenants(null)
    await ventPaa(() => !loading.value)
    expect(tenants.value).toEqual([])
  })

  it('indlæser kun lejere for det givne ejendomId, nyeste lejemål først', async () => {
    const ejendomA = 1
    const ejendomB = 2
    await db.tenants.bulkAdd([
      { ejendomId: ejendomA, navn: 'Ældst', lejemaalStart: '2020-01-01' },
      { ejendomId: ejendomA, navn: 'Nyest', lejemaalStart: '2024-01-01' },
      { ejendomId: ejendomB, navn: 'Anden ejendom', lejemaalStart: '2023-01-01' },
    ])

    const { tenants, loading } = useTenants(ejendomA)
    await ventPaa(() => !loading.value)

    expect(tenants.value.map((t) => t.navn)).toEqual(['Nyest', 'Ældst'])
  })

  it('tilføjer en lejer med det aktive ejendomId og genindlæser', async () => {
    const ejendomId = ref(1)
    const { tenants, loading, addTenant } = useTenants(ejendomId)
    await ventPaa(() => !loading.value)

    const id = await addTenant({ navn: 'Ny Lejer', lejemaalStart: '2026-01-01' })

    expect(tenants.value).toHaveLength(1)
    expect(tenants.value[0]).toMatchObject({ id, navn: 'Ny Lejer', ejendomId: 1 })
  })

  it('opdaterer og sletter en lejer', async () => {
    const ejendomId = 1
    const id = await db.tenants.add({ ejendomId, navn: 'Jane', lejemaalStart: '2026-01-01' })
    const { tenants, loading, updateTenant, deleteTenant } = useTenants(ejendomId)
    await ventPaa(() => !loading.value)

    await updateTenant(id, { navn: 'Jane Doe' })
    expect(tenants.value[0].navn).toBe('Jane Doe')

    await deleteTenant(id)
    expect(tenants.value).toEqual([])
  })

  it('genindlæser reaktivt når ejendomId skifter', async () => {
    await db.tenants.bulkAdd([
      { ejendomId: 1, navn: 'Ejendom 1-lejer', lejemaalStart: '2026-01-01' },
      { ejendomId: 2, navn: 'Ejendom 2-lejer', lejemaalStart: '2026-01-01' },
    ])
    const ejendomId = ref(1)

    const { tenants, loading } = useTenants(ejendomId)
    await ventPaa(() => !loading.value)
    expect(tenants.value.map((t) => t.navn)).toEqual(['Ejendom 1-lejer'])

    ejendomId.value = 2
    await ventPaa(() => tenants.value.map((t) => t.navn).join() === 'Ejendom 2-lejer')
  })
})
