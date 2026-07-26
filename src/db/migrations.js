// Upgrade-callbacks til de versionerede db.version(N)-blokke i src/db/index.js. Flyttet hertil for
// at holde definerSkema() overskuelig - selve version-blokkenes .stores()/.upgrade()-kobling i
// index.js er uændret, kun hvor callback-kroppen er erklæret.
//
// KRITISK REGEL (samme som i index.js): rediger aldrig et allerede udgivet migrations-trin herunder.
// Skal noget rettes i en tidligere version, tilføj i stedet en ny version i index.js.

export async function migrerBfeNummer(tx) {
  await tx
    .table('property')
    .toCollection()
    .modify((p) => {
      p.bfeNr = p.bbrNr
      delete p.bbrNr
    })
}

export async function migrerRealkreditgaeldTilVsoSettings(tx) {
  const ejendomme = await tx.table('property').toArray()
  const eksisterendeGaeld = ejendomme[0]?.realkreditgaeld

  if (eksisterendeGaeld != null) {
    await tx
      .table('vsoSettings')
      .toCollection()
      .modify((s) => {
        if (s.realkreditgaeld == null) {
          s.realkreditgaeld = eksisterendeGaeld
        }
      })
  }

  await tx
    .table('property')
    .toCollection()
    .modify((p) => {
      delete p.realkreditgaeld
    })
}

export async function migrerEjendomId(tx) {
  const ejendomme = await tx.table('property').toArray()
  const foersteEjendomId = ejendomme[0]?.id
  if (foersteEjendomId == null) {
    return
  }

  for (const tabel of ['tenants', 'transactions', 'recurringTransactions', 'vsoSettings']) {
    await tx
      .table(tabel)
      .toCollection()
      .modify((r) => {
        if (r.ejendomId == null) {
          r.ejendomId = foersteEjendomId
        }
      })
  }
}
