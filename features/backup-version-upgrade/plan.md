# Versionsopgradering af backups

## Kontekst

Backup-eksport/import (`src/db/backup.js`, brugt fra `StamdataView.vue`) bruger `dexie-export-import`.
Biblioteket kræver at backuppens `databaseVersion` matcher databasens nuværende Dexie-schemaversion
**præcis** — ellers kaster `importInto` `"Database version differs"`. Fejlen fanges ingen steder i
appen, så `onImportBackup` i `StamdataView.vue` fejler tavst: `location.reload()` når aldrig at køre,
men brugeren ser ingen fejlmeddelelse. Det er allerede dokumenteret som et kendt, urettet problem i
`BACKLOG.md:94-104` og i kommentaren i `src/db/index.js:15-17` (tilføjet i commit `a7c79f2`), og blev
empirisk bekræftet ved at eksportere en backup, simulere en fremtidig schemaversion, og forsøge at
importere.

Konsekvens: enhver backup, der er taget i dag, kan ikke genskabes, næste gang appens
database-schema opdateres (`src/db/index.js` får en ny `db.version(n)`-blok) — uden nogen synlig fejl.

Brugeren har netop taget en frisk backup på nuværende schemaversion (5) og er indtil videre eneste
bruger af appen, så der er ingen ældre backup-filer i omløb der skal understøttes bagud. Formålet er
derfor at bygge den generelle mekanisme, der virker **fremadrettet** fra i dag: enhver fremtidig
schema-ændring skal kunne migrere en ældre backup op til den nyeste version automatisk, ved at
genbruge de samme `.upgrade()`-trin som allerede findes (og er testet) for den levende database.

## Løsning: migrér backuppen via en midlertidig database

`dexie-export-import` kan ikke selv migrere data mellem schemaversioner — den kan kun importere 1:1
mod en database, der allerede er på præcis samme version. Men Dexie's **egen** versioneringsmekanisme
(som allerede er dokumenteret og testet i `tests/unit/dbMigrations.spec.js`) kører automatisk de
manglende `.upgrade()`-trin, når en *rigtig* IndexedDB-database åbnes med en nyere skema-deklaration
end den er på. Den mekanisme genbruger vi:

1. Læs backuppens `data.databaseVersion` fra JSON-filen.
2. Hvis den matcher nuværende skemaversion → importér direkte som i dag (hurtig sti, uændret adfærd).
3. Hvis backuppen er **nyere** end appens nuværende skemaversion → afvis med en tydelig dansk
   fejlmeddelelse ("opdater appen"). Der findes ingen fremtidig upgrade-kode at køre, så dette kan
   ikke migreres.
4. Hvis backuppen er **ældre**:
   a. Opret en midlertidig, unikt navngivet Dexie-database, deklareret **kun** op til backuppens
      version (matcher derfor præcist → `importInto` lykkes uden `acceptVersionDiff`).
   b. Luk den, genåbn samme midlertidige database-navn, men nu deklareret med **hele** version-kæden
      op til nuværende version. Dexie opdager selv at databasen er "bagud" og kører automatisk de
      manglende `.upgrade()`-trin — præcis den samme kode der allerede migrerer den levende database.
   c. Eksportér den nu opgraderede midlertidige database til en ny JSON-blob.
   d. Importér den blob ind i den rigtige `db` (versionerne matcher nu → normal import).
   e. Slet den midlertidige database.

Denne tilgang duplikerer ingen migreringslogik — `.upgrade()`-trinnene i `src/db/index.js` er eneste
sted, migreringsregler findes, uanset om det er den levende database eller en genskabt backup der
opgraderes.

## Filer der ændres

**`src/db/index.js`** — udtræk de nuværende `db.version(n).stores(...).upgrade(...)`-kald til en
genbrugelig funktion, fx:

```js
export function definerSkema(dexieInstance, tilVersion = HOEJESTE_VERSION) {
  if (tilVersion >= 1) dexieInstance.version(1).stores({ ... })
  if (tilVersion >= 2) dexieInstance.version(2).stores({ ... })
  if (tilVersion >= 3) dexieInstance.version(3).stores({ ... }).upgrade(...)
  if (tilVersion >= 4) dexieInstance.version(4).stores({ ... }).upgrade(...)
  if (tilVersion >= 5) dexieInstance.version(5).stores({ ... }).upgrade(...)
}

export const db = new Dexie('LejlighedsudlejningRegnskab')
definerSkema(db)
```

`db.verno` er allerede Dexie's egen kilde til "højeste deklarerede version" — brug den direkte i
stedet for en separat hårdkodet konstant, så der ikke er to steder at huske at opdatere når en ny
`db.version(n)`-blok tilføjes. Behold eksisterende eksports (`db` m.fl.) uændrede; tilføj kun
`definerSkema` som nyt named export. **Rør ikke ved indholdet af de eksisterende version-blokke** —
kun hvordan de kaldes (jf. den kritiske regel der allerede står i filens header-kommentar).

**`src/db/backup.js`** — omskriv `importerBackup` til at implementere trin 1-4 ovenfor:
- Læs og parse JSON-filen selv (eller brug `dexie-export-import`'s metadata-helper hvis den findes —
  tjek biblioteket for en `peakImportFile`-lignende funktion før man parser JSON manuelt) for at
  hente `databaseVersion` uden at forbruge filen.
- Kast en tydelig fejl (dansk tekst) ved nyere-end-nuværende.
- Implementér den midlertidige database-migrering ved ældre-end-nuværende, med oprydning af den
  midlertidige database i en `finally`, så der ikke efterlades orphan-databaser i browseren selv
  hvis noget fejler undervejs.
- Bevar `clearTablesBeforeImport: true` i det endelige import-kald mod den rigtige `db`, så
  atomiciteten (ingen delvis import) bevares som i dag.

**`src/views/StamdataView.vue`** — `onImportBackup` (linje 105-114) skal wrappe
`await importerBackup(file)` i try/catch, sætte en reaktiv fejl-ref med `err.message` ved fejl (så
brugeren rent faktisk ser noget), og kun kalde `location.reload()` ved succes. Tilføj et lille
fejltekst-element i templaten nær importknappen (linje ~294-309), stil-mæssigt konsistent med resten
af siden.

**`BACKLOG.md`** — fjern eller afkryds punktet på linje 94-104, siden det nu er løst.

**`src/db/index.js`** kommentar (linje 15-17) — opdatér sætningen om at backup-import af ældre
versioner fejler uden migrering; det er ikke længere sandt.

## Tests

**`tests/unit/backup.spec.js`** — tilføj:
- Import af backup fra en nyere version end nuværende → forvent kastet fejl med forståelig
  besked, og at eksisterende data i `db` er urørt bagefter (atomicitet bevaret).
- Import af backup fra en ældre version → genbrug mønsteret fra `seedGammelDatabase()` i
  `tests/unit/dbMigrations.spec.js` (opret en rå Dexie-database med kun et delvist gammelt schema,
  fyld den med data, eksportér den til en JSON-blob) som input til den nye `importerBackup`, og
  assertér at data efter import i den rigtige `db` er korrekt migreret (fx `ejendomId` er
  tilbagefyldt, felter omdøbt) — samme assertions-stil som de eksisterende migrationstests.
- Behold den eksisterende same-version-test uændret (hurtig sti skal stadig virke).

Ingen nye e2e-tests er nødvendige — den eksisterende `e2e/navigation.spec.js`-test af eksport
påvirkes ikke.

## Rækkefølge

1. Opret feature branch `feat/backup-version-upgrade` fra `main`. ✅
2. Commit denne plan til repoet på feature-branchen, **før** noget implementeringsarbejde starter —
   som `features/backup-version-upgrade/plan.md`, med commit-besked
   `docs: tilføj plan for backup version upgrade`. Selve implementeringen sker i efterfølgende
   commits ovenpå denne.
3. Refaktorér `src/db/index.js` (`definerSkema`), verificér `npm test` stadig er grøn (særligt
   `tests/unit/dbMigrations.spec.js`, som er mest følsom over for ændringer her).
4. Omskriv `src/db/backup.js` med migrerings-mekanismen.
5. Ret fejlhåndtering og fejlvisning i `StamdataView.vue`.
6. Tilføj de to nye testcases i `tests/unit/backup.spec.js`.
7. Opdatér `BACKLOG.md` og kommentaren i `src/db/index.js`.
8. Kør `npm test` og `npm run test:e2e`, og lav en manuel røgtest: eksportér en backup, tilføj
   midlertidigt en dummy `db.version(6)` lokalt for at simulere en fremtidig schemaændring (som
   brugeren allerede gjorde manuelt tidligere), importér den gamle backup, og bekræft data
   genskabes korrekt — fjern dummy-versionen igen bagefter.

## Verifikation

- `npm test` (Vitest) skal være grøn, inkl. de nye backup-migrations-tests.
- `npm run test:e2e` (Playwright) skal fortsat bestå, specielt eksport-testen i
  `e2e/navigation.spec.js:218-227`.
- Manuel røgtest i browseren som beskrevet i trin 8, som direkte reproducerer og verificerer fix på
  det scenarie, der oprindeligt blev fundet empirisk og noteret i `BACKLOG.md`.
