import Dexie from 'dexie'

export const db = new Dexie('LejlighedsudlejningRegnskab')

db.version(1).stores({
  property: '++id, adresse, bbrNr',
  tenants: '++id, navn, lejemaalStart, lejemaalSlut',
  transactions: '++id, dato, type, kategori, belob, tenantId',
  vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
})

db.version(2).stores({
  property: '++id, adresse, bbrNr',
  tenants: '++id, navn, lejemaalStart, lejemaalSlut',
  transactions: '++id, dato, type, kategori, belob, tenantId',
  vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
  recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
})

// "BBR-nr." findes reelt ikke som selvstændigt opslagsnummer - BBR er registeret, ikke et
// ejendoms-ID. Det korrekte, opslåelige nummer er BFE-nummeret (Bestemt Fast Ejendom), som
// erstattede det gamle kommunale ejendomsnummer/ESR-nummer i 2019.
db.version(3).stores({
  property: '++id, adresse, bfeNr',
  tenants: '++id, navn, lejemaalStart, lejemaalSlut',
  transactions: '++id, dato, type, kategori, belob, tenantId',
  vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
  recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
}).upgrade(async (tx) => {
  await tx
    .table('property')
    .toCollection()
    .modify((p) => {
      p.bfeNr = p.bbrNr
      delete p.bbrNr
    })
})

// Realkreditgæld ændrer sig hvert år (lånet afdrages løbende), og VSL § 8 kræver at
// kapitalafkastgrundlaget opgøres primo året - et enkelt fast tal pr. ejendom kan ikke
// repræsentere det korrekt. Flyttet fra property (ét tal) til vsoSettings (ét tal pr. år),
// ligesom banksaldo og skyldigt depositum. Eksisterende værdi kopieres ind i alle allerede
// oprettede års-rækker som udgangspunkt - bør efterfølgende rettes til det korrekte primo-tal
// for hvert år.
db.version(4).stores({
  property: '++id, adresse, bfeNr',
  tenants: '++id, navn, lejemaalStart, lejemaalSlut',
  transactions: '++id, dato, type, kategori, belob, tenantId',
  vsoSettings: '++id, aar, kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
  recurringTransactions: '++id, type, kategori, hyppighed, startDato, slutDato, tenantId',
}).upgrade(async (tx) => {
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

// Understøtter flere udlejningsejendomme man kan skifte imellem, i stedet for at appen implicit
// antager der findes præcis én. tenants/transactions/recurringTransactions/vsoSettings får et
// ejendomId-felt; vsoSettings får desuden et compound-indeks [ejendomId+aar], da indstillingerne
// nu er pr. ejendom pr. år, ikke kun pr. år. Fandtes der allerede én ejendom (kun muligt før denne
// ændring), tagges alle eksisterende rækker automatisk med dens id, så eksisterende brugere ikke
// mister deres data - findes ingen ejendom endnu, er der intet at migrere.
db.version(5).stores({
  property: '++id, adresse, bfeNr',
  tenants: '++id, ejendomId, navn, lejemaalStart, lejemaalSlut',
  transactions: '++id, ejendomId, dato, type, kategori, belob, tenantId',
  vsoSettings: '++id, ejendomId, aar, [ejendomId+aar], kapitalafkastsats, rentekorrektionssats, indskudskonto, opsparetOverskud',
  recurringTransactions: '++id, ejendomId, type, kategori, hyppighed, startDato, slutDato, tenantId',
}).upgrade(async (tx) => {
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

export default db
