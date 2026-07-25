import Dexie from 'dexie'

// Sådan virker schema-migrationer her: hver bruger har sin egen IndexedDB i browseren, med sit
// eget indbyggede versionsnummer (et browser-koncept, ikke noget vi selv fører). Når appen
// starter, sammenligner Dexie "hvilken version koden her erklærer" (den sidste db.version(N)
// nedenfor) med "hvilken version denne browsers database faktisk er på", og kører automatisk kun
// de .upgrade()-trin der mangler, i rækkefølge - fra hvor brugeren står og frem til den nyeste. En
// helt ny installation springer det hele over og opretter databasen direkte i sin nyeste form.
// Data slettes/genskabes aldrig - upgrade() patcher eksisterende rækker på plads.
//
// KRITISK REGEL: rediger aldrig et allerede udgivet db.version(N)-blok. Brugere der allerede har
// kørt den, får den ikke kørt igen - kun helt nye .version(N+1)-blokke bliver set af dem. Skal
// noget rettes i en tidligere version, tilføj en ny version i stedet.
//
// Denne mekanisme dækker kun den KØRENDE app mod sin egen browser-database - IKKE JSON-backups
// direkte (se db/backup.js) - men importerBackup() genbruger definerSkema() nedenfor til at
// migrere en ældre backup op til nuværende version, via en midlertidig database, før den
// importeres i den rigtige database.

const NYESTE_VERSION = 5

/**
 * Deklarerer db.version()-kæden op til (og med) `tilVersion` på en given Dexie-instans. Kaldes med
 * hele kæden for den rigtige `db` nedenfor, men også af db/backup.js på midlertidige
 * Dexie-instanser for at migrere gamle backup-filer: én gang med kun de versioner backuppen selv
 * er på (så importInto ser en eksakt versionsmatch), og én gang med hele kæden bagefter (så Dexie
 * selv kører de manglende .upgrade()-trin, ligesom ved en almindelig app-opgradering).
 *
 * KRITISK REGEL: rediger aldrig et allerede udgivet db.version(N)-blok herunder. Brugere der
 * allerede har kørt den, får den ikke kørt igen - kun helt nye .version(N+1)-blokke bliver set af
 * dem. Skal noget rettes i en tidligere version, tilføj en ny version i stedet.
 */
export function definerSkema(dexieInstance, tilVersion = NYESTE_VERSION) {
  if (tilVersion >= 1) {
    dexieInstance.version(1).stores({
      property: '++id, adresse, bbrNr',
      tenants: '++id, navn, lejemaalStart, lejemaalSlut',
      transactions: '++id, dato, type, kategori, belob, tenantId',
      vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
    })
  }

  if (tilVersion >= 2) {
    dexieInstance.version(2).stores({
      property: '++id, adresse, bbrNr',
      tenants: '++id, navn, lejemaalStart, lejemaalSlut',
      transactions: '++id, dato, type, kategori, belob, tenantId',
      vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
      recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
    })
  }

  // "BBR-nr." findes reelt ikke som selvstændigt opslagsnummer - BBR er registeret, ikke et
  // ejendoms-ID. Det korrekte, opslåelige nummer er BFE-nummeret (Bestemt Fast Ejendom), som
  // erstattede det gamle kommunale ejendomsnummer/ESR-nummer i 2019.
  if (tilVersion >= 3) {
    dexieInstance
      .version(3)
      .stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      .upgrade(async (tx) => {
        await tx
          .table('property')
          .toCollection()
          .modify((p) => {
            p.bfeNr = p.bbrNr
            delete p.bbrNr
          })
      })
  }

  // Realkreditgæld ændrer sig hvert år (lånet afdrages løbende), og VSL § 8 kræver at
  // kapitalafkastgrundlaget opgøres primo året - et enkelt fast tal pr. ejendom kan ikke
  // repræsentere det korrekt. Flyttet fra property (ét tal) til vsoSettings (ét tal pr. år),
  // ligesom banksaldo og skyldigt depositum. Eksisterende værdi kopieres ind i alle allerede
  // oprettede års-rækker som udgangspunkt - bør efterfølgende rettes til det korrekte primo-tal
  // for hvert år.
  if (tilVersion >= 4) {
    dexieInstance
      .version(4)
      .stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      .upgrade(async (tx) => {
        const ejendomme = await tx.table('property').toArray()
        const eksisterendeGaeld = ejendomme[0]?.realkreditgaeld

        if (eksisterendeGaeld != null) {
          await tx
            .table('vsoSettings')
            .toCollection()
            .modify((s) => {
              if (s.realkreditgaeld == null) s.realkreditgaeld = eksisterendeGaeld
            })
        }

        await tx
          .table('property')
          .toCollection()
          .modify((p) => {
            delete p.realkreditgaeld
          })
      })
  }

  // Understøtter flere udlejningsejendomme man kan skifte imellem, i stedet for at appen implicit
  // antager der findes præcis én. tenants/transactions/recurringTransactions/vsoSettings får et
  // ejendomId-felt; vsoSettings får desuden et compound-indeks [ejendomId+aar], da indstillingerne
  // nu er pr. ejendom pr. år, ikke kun pr. år. Fandtes der allerede én ejendom (kun muligt før
  // denne ændring), tagges alle eksisterende rækker automatisk med dens id, så eksisterende
  // brugere ikke mister deres data - findes ingen ejendom endnu, er der intet at migrere.
  if (tilVersion >= 5) {
    dexieInstance
      .version(5)
      .stores({
        property: '++id, adresse, bfeNr',
        tenants: '++id, ejendomId, navn, lejemaalStart, lejemaalSlut',
        transactions: '++id, ejendomId, dato, type, kategori, belob, tenantId',
        vsoSettings: '++id, ejendomId, aar, [ejendomId+aar], kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
        recurringTransactions: '++id, ejendomId, type, kategori, hyppighed, startDato, slutDato, tenantId',
      })
      .upgrade(async (tx) => {
        const ejendomme = await tx.table('property').toArray()
        const foersteEjendomId = ejendomme[0]?.id
        if (foersteEjendomId == null) return

        for (const tabel of ['tenants', 'transactions', 'recurringTransactions', 'vsoSettings']) {
          await tx
            .table(tabel)
            .toCollection()
            .modify((r) => {
              if (r.ejendomId == null) r.ejendomId = foersteEjendomId
            })
        }
      })
  }
}

export const db = new Dexie('LejlighedsudlejningRegnskab')
definerSkema(db)

export default db
