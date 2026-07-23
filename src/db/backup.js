import { exportDB, importInto } from 'dexie-export-import'
import { db } from './index'

export async function eksporterBackup() {
  const blob = await exportDB(db)
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dato = new Date().toISOString().slice(0, 10)
  a.href = url
  a.download = `lejlighedsudlejning-backup-${dato}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export async function importerBackup(file) {
  await importInto(db, file, { clearTablesBeforeImport: true })
}
