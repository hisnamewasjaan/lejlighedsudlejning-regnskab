import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'

const DB_NAVN = 'LejlighedsudlejningRegnskab'

beforeEach(async () => {
  localStorage.clear()
  await Dexie.delete(DB_NAVN)
  vi.resetModules()
})

/**
 * Opretter databasen med en tidligere skemaversion og udfylder den med data i det gamle format -
 * simulerer en eksisterende bruger, der opgraderer appen. Lukker forbindelsen bagefter, så den
 * efterfølgende import af den rigtige `@/db` (med alle versionstrin) kan åbne og migrere den.
 */
async function seedGammelDatabase(byg) {
  const gammelDb = new Dexie(DB_NAVN)
  await byg(gammelDb)
  await gammelDb.open()
  return gammelDb
}

describe('db-migrationer', () => {
  it('version 3: omdøber property.bbrNr til bfeNr', async () => {
    const gammel = await seedGammelDatabase(async (d) => {
      d.version(2).stores({
        property: '++id, adresse, bbrNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      await d.table('property').add({ adresse: 'Testvej 1', bbrNr: '12345' })
    })
    gammel.close()

    const { db } = await import('@/db')
    await db.open()

    const property = (await db.property.toArray())[0]
    expect(property.bfeNr).toBe('12345')
    expect(property.bbrNr).toBeUndefined()
  })

  it('version 4: flytter realkreditgaeld fra property til alle vsoSettings-rækker', async () => {
    const gammel = await seedGammelDatabase(async (d) => {
      d.version(3).stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      await d.table('property').add({ adresse: 'Testvej 1', bfeNr: '12345', realkreditgaeld: 500000 })
      await d.table('vsoSettings').bulkAdd([
        { aar: 2025, kapitalafkastsats: 0.02 },
        { aar: 2026, kapitalafkastsats: 0.02, realkreditgaeld: 999999 },
      ])
    })
    gammel.close()

    const { db } = await import('@/db')
    await db.open()

    const property = (await db.property.toArray())[0]
    expect(property.realkreditgaeld).toBeUndefined()

    const settings = await db.vsoSettings.orderBy('aar').toArray()
    expect(settings[0].realkreditgaeld).toBe(500000)
    // Rækker der allerede havde en værdi skal ikke overskrives af migreringen.
    expect(settings[1].realkreditgaeld).toBe(999999)
  })

  it('version 4: rører ikke vsoSettings hvis property aldrig havde realkreditgaeld', async () => {
    const gammel = await seedGammelDatabase(async (d) => {
      d.version(3).stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      await d.table('property').add({ adresse: 'Testvej 1', bfeNr: '12345' })
      await d.table('vsoSettings').add({ aar: 2025, kapitalafkastsats: 0.02 })
    })
    gammel.close()

    const { db } = await import('@/db')
    await db.open()

    const settings = (await db.vsoSettings.toArray())[0]
    expect(settings.realkreditgaeld).toBeUndefined()
  })

  it('version 5: tagger alle eksisterende rækker med den eneste ejendoms id', async () => {
    const gammel = await seedGammelDatabase(async (d) => {
      d.version(4).stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      const ejendomId = await d.table('property').add({ adresse: 'Testvej 1', bfeNr: '12345' })
      await d.table('tenants').add({ navn: 'Jane', lejemaalStart: '2025-01-01' })
      await d.table('transactions').add({ dato: '2025-01-01', type: 'indtaegt', kategori: 'husleje', belob: 8000 })
      await d.table('vsoSettings').add({ aar: 2025, kapitalafkastsats: 0.02 })
      await d
        .table('recurringTransactions')
        .add({ type: 'indtaegt', kategori: 'husleje', hyppighed: 'maanedlig', startDato: '2025-01-01' })
      return ejendomId
    })
    const forventetEjendomId = (await gammel.table('property').toArray())[0].id
    gammel.close()

    const { db } = await import('@/db')
    await db.open()

    expect((await db.tenants.toArray())[0].ejendomId).toBe(forventetEjendomId)
    expect((await db.transactions.toArray())[0].ejendomId).toBe(forventetEjendomId)
    expect((await db.vsoSettings.toArray())[0].ejendomId).toBe(forventetEjendomId)
    expect((await db.recurringTransactions.toArray())[0].ejendomId).toBe(forventetEjendomId)
  })

  it('version 5: efterlader tabellerne tomme hvis der endnu ikke findes nogen ejendom', async () => {
    const gammel = await seedGammelDatabase(async (d) => {
      d.version(4).stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
    })
    gammel.close()

    const { db } = await import('@/db')
    await db.open()

    expect(await db.property.count()).toBe(0)
    expect(await db.tenants.count()).toBe(0)
  })
})
