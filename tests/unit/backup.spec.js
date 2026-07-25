import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
import { exportDB } from 'dexie-export-import'
import { nulstilDatabase } from './setup/testDb'

let db
let eksporterBackup
let importerBackup

beforeEach(async () => {
  ;({ db } = await nulstilDatabase())
  ;({ eksporterBackup, importerBackup } = await import('@/db/backup'))
})

describe('eksporterBackup', () => {
  const oprindeligCreateElement = document.createElement.bind(document)
  let anker

  beforeEach(() => {
    anker = null
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = oprindeligCreateElement(tag)
      if (tag === 'a') {
        el.click = vi.fn()
        anker = el
      }
      return el
    })
    URL.createObjectURL = vi.fn(() => 'blob:mock-url')
    URL.revokeObjectURL = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete URL.createObjectURL
    delete URL.revokeObjectURL
  })

  it('eksporterer databasen som en fil med dags dato i filnavnet, og rydder op efter sig', async () => {
    await db.property.add({ adresse: 'Testvej 1' })

    await eksporterBackup()

    const iDag = new Date().toISOString().slice(0, 10)
    expect(anker.download).toBe(`lejlighedsudlejning-backup-${iDag}.json`)
    expect(anker.href).toBe('blob:mock-url')
    expect(anker.click).toHaveBeenCalledOnce()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })
})

describe('importerBackup', () => {
  it('gendanner data fra en tidligere eksporteret backup, og rydder eksisterende data først', async () => {
    await db.property.add({ adresse: 'Original adresse' })
    await db.tenants.add({ ejendomId: 1, navn: 'Original Lejer', lejemaalStart: '2025-01-01' })
    const backupBlob = await exportDB(db)

    await db.property.clear()
    await db.tenants.clear()
    await db.property.add({ adresse: 'Data der skal overskrives' })

    await importerBackup(backupBlob)

    const properties = await db.property.toArray()
    const tenants = await db.tenants.toArray()
    expect(properties).toHaveLength(1)
    expect(properties[0].adresse).toBe('Original adresse')
    expect(tenants).toHaveLength(1)
    expect(tenants[0].navn).toBe('Original Lejer')
  })

  it('migrerer en ældre backup op til nuværende skemaversion via de eksisterende upgrade()-trin', async () => {
    const midlertidigtNavn = `gammel-backup-test-${Date.now()}`
    const gammel = new Dexie(midlertidigtNavn)
    gammel.version(4).stores({
      property: '++id, adresse, bfeNr',
      tenants: '++id, navn, lejemaalStart, lejemaalSlut',
      transactions: '++id, dato, type, kategori, belob, tenantId',
      vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
      recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
    })
    await gammel.open()
    const ejendomId = await gammel.table('property').add({ adresse: 'Gammel adresse', bfeNr: '99999' })
    await gammel.table('tenants').add({ navn: 'Gammel Lejer', lejemaalStart: '2020-01-01' })
    const backupBlob = await exportDB(gammel)
    gammel.close()
    await Dexie.delete(midlertidigtNavn)

    await importerBackup(backupBlob)

    const tenants = await db.tenants.toArray()
    expect(tenants).toHaveLength(1)
    expect(tenants[0].navn).toBe('Gammel Lejer')
    // Version 5-upgraden skal have tagget rækken med ejendomens id, selvom backuppen er fra før
    // det felt fandtes.
    expect(tenants[0].ejendomId).toBe(ejendomId)
  })

  it('afviser import af en backup fra en nyere version end nuværende, uden at røre eksisterende data', async () => {
    await db.property.add({ adresse: 'Original adresse' })

    const fremtidigJson = {
      formatName: 'dexie',
      formatVersion: 1,
      data: {
        databaseName: db.name,
        databaseVersion: db.verno + 1,
        tables: [],
        data: [],
      },
    }
    const fremtidigBlob = new Blob([JSON.stringify(fremtidigJson)], { type: 'application/json' })

    await expect(importerBackup(fremtidigBlob)).rejects.toThrow(/nyere version/)

    const properties = await db.property.toArray()
    expect(properties).toHaveLength(1)
    expect(properties[0].adresse).toBe('Original adresse')
  })
})
