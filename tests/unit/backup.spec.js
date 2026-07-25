import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
})
