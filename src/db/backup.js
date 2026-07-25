import Dexie from 'dexie'
import { exportDB, importInto, peakImportFile } from 'dexie-export-import'
import { db, definerSkema } from './index'

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

/**
 * dexie-export-import kan kun importere 1:1 mod en database, der allerede står på præcis samme
 * skemaversion som backuppen. Er backuppen ældre end appens nuværende version, migrerer vi den
 * derfor selv først: importerer den ind i en midlertidig database, der kun kender backuppens egen
 * (gamle) skemaversion, genåbner så samme midlertidige database med hele skemakæden frem til
 * nuværende version - hvorved Dexie selv kører de manglende .upgrade()-trin, præcis som ved en
 * almindelig app-opgradering - og importerer så den nu opgraderede data i den rigtige database.
 */
export async function importerBackup(file) {
  const meta = await peakImportFile(file)
  const backupVersion = meta.data.databaseVersion
  const nuvaerendeVersion = db.verno

  if (backupVersion === nuvaerendeVersion) {
    await importInto(db, file, { clearTablesBeforeImport: true })
    return
  }

  if (backupVersion > nuvaerendeVersion) {
    throw new Error(
      `Backuppen er fra en nyere version af appen (version ${backupVersion}) end den du kører nu (version ${nuvaerendeVersion}). Opdater appen, og prøv at importere igen.`,
    )
  }

  const midlertidigtNavn = `LejlighedsudlejningRegnskab-migrering-${Date.now()}`
  try {
    const gammelDb = new Dexie(midlertidigtNavn)
    definerSkema(gammelDb, backupVersion)
    await importInto(gammelDb, file, { clearTablesBeforeImport: true, acceptNameDiff: true })
    gammelDb.close()

    const opgraderetDb = new Dexie(midlertidigtNavn)
    definerSkema(opgraderetDb, nuvaerendeVersion)
    await opgraderetDb.open()
    const migreretBlob = await exportDB(opgraderetDb)
    opgraderetDb.close()

    // Den migrerede blob har den midlertidige databases navn i sig, ikke den rigtige databases -
    // det er forventet og ufarligt her, så navnetjekket springes bevidst over.
    await importInto(db, migreretBlob, { clearTablesBeforeImport: true, acceptNameDiff: true })
  } finally {
    await Dexie.delete(midlertidigtNavn)
  }
}
