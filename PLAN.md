# Plan: Lejlighedsudlejning Regnskabsapp

## Problem

Din hustru udlejer en lejlighed i Danmark under **virksomhedsordningen (VSO)**. I ønsker en lokal webapplikation der kan erstatte revisoren – dvs. håndtere bogføring, VSO-beregninger og årsrapport.

## Teknisk stack

- **Frontend**: Vue.js 3 (Composition API + `<script setup>`) + Vite + Tailwind CSS
- **Database**: IndexedDB via **Dexie.js** (gemmer alt i browseren – ingen backend)
- **Ingen server**: Åbn blot appen i browseren efter `npm run dev`
- **Local-first**: Al data lever i browserens IndexedDB – fungerer offline
- **Test**: Vitest til unit-tests af beregningslogik (composables). VSO-beregningsmodulet skal have testdækning – med testcases valideret mod tal fra tidligere revisor-udarbejdede regnskaber – før det tages i brug til reelle tal
- **E2E-test**: Playwright til de kritiske flows (fx bogføring → dashboard, hævningsberegner, backup-eksport) – ikke fuld dækning af hver knap
- **Commit-linting**: commitlint (`@commitlint/config-conventional`) + Husky commit-msg hook – håndhæver Conventional Commits (`feat:`, `fix:`, `chore:` osv.)

> **Fremtidig forbedring**: Tilføj backend + sync så data kan tilgås fra flere enheder. Arkitekturen designes med dette for øje (Dexie.js understøtter sync-lag via Dexie Cloud eller custom backend).

---

## Moduler og features

### 1. Stamdata

- Lejlighedsoplysninger: adresse, BFE-nummer, ejendomsværdi, anskaffelsespris, realkreditgæld
- Lejeroplysninger: navn, kontakt, lejemålsperiode, månedlig husleje, depositum

### 2. Bogføring – Indtægter

- Månedlige huslejeindbetalinger
- Depositumindbetalinger og -tilbagebetalinger
- Andre indtægter

### 3. Bogføring – Udgifter (fradragsberettigede under VSO)

- Ejerforeningsbidrag
- Ejendomsskat / grundskyld
- Forsikring
- Vedligeholdelse (løbende og større)
- Realkreditrenter og bidrag
- Administrationsomkostninger
- Regnskabs- og revisoromkostninger

### 4. Virksomhedsordningen (VSO)

- Kapitalafkastgrundlag (aktiver minus gæld i VSO)
- Kapitalafkastsats (hentes/indstilles manuelt – SKAT fastsætter den hvert år)
- Kapitalafkast beregning
- Opsparet overskud og virksomhedsskat (22%)
- Hæverækkefølge

### 5. Årsregnskab & rapporter

- Resultatopgørelse pr. år
- Skattemæssig opgørelse (til brug ved selvangivelse)
- Månedsoversigt
- PDF-eksport af årsrapport

### 6. Dashboard

- Overblik over årets indtægter vs. udgifter
- Estimeret skat
- Huslejestatus (betalt/mangler)

> Se [SKATTEREGLER.md](./SKATTEREGLER.md) for aktuelle satser og åbne afklaringspunkter, der bør undersøges nærmere (med SKAT/revisor) før de tilhørende beregninger implementeres.

## Relevante danske regler – detaljeret

### Virksomhedsordningen (VSO) – overblik

Reglerne stammer fra **Virksomhedsskatteloven (VSL)**.

#### Indskudskonto (VSL § 3)

- Registrerer hvad der er indskudt i virksomheden (lejlighed + bankkonto)
- Sættes op ved VSO-start og ændres ved nye indskud/hævninger
- **I appen**: Indstilles som startværdi under VSO-stamdata

#### Kapitalafkastgrundlag & kapitalafkast (VSL § 7-8)

- **Grundlag** = Aktiver i VSO (ejendomsværdi + banksaldo) minus erhvervsmæssig gæld (realkreditgæld)
- **Kapitalafkastsats** fastsættes af SKAT hvert år (0% i 2021-2023, pt. ca. 3-4%)
- **Kapitalafkast** = Grundlag × Sats → beskattes som _kapitalindkomst_ (ikke personlig indkomst)
- **I appen**: Beregnes automatisk. Sats indtastes manuelt fra SKAT's hjemmeside.

#### Årets overskud og virksomhedsskat (VSL § 10)

- Overskud = Lejeindtægter − Udgifter − Afskrivninger − Kapitalafkast
- Man kan vælge at **opspare overskud** i VSO mod 22% foreløbig virksomhedsskat
- Det opsparede beløb: `Opsparet overskud × (1 − 22%) = netto til rådighed for fremtidig hævning`
- **I appen**: Brugeren vælger hvert år om overskud hæves eller opspares

#### Hæverækkefølgen (VSL § 5) – kritisk for skatteberegning

Når der hæves penge (overføres til privat), sker det i denne rækkefølge:

1. **Kapitalafkast** (beskattes som kapitalindkomst, ca. 37% marginalskat)
2. **Overskud fra årets drift** (beskattes som personlig indkomst, op til ca. 56%)
3. **Opsparet overskud fra tidligere år** (betales restskat: marginalskatteprocent − 22%)
4. **Indskudskonto** (skattefrit – det er blot tilbagebetaling af eget indskud)

> **Hævningsberegner** i appen: Brugeren kan indtaste et beløb og se den forventede skatteeffekt baseret på hæverækkefølgen.

#### Rentekorrektion (VSL § 11)

- Hvis indskudskontoen er negativ, beregnes rentekorrektion
- Rentekorrektionssats fastsættes af SKAT (p.t. ca. 3-4%)
- Forhindrer at man "låner" privat gæld ind i VSO
- **I appen**: Advarsel hvis indskudskonto er negativ + automatisk beregning

---

### Afskrivninger (Afskrivningsloven)

| Type                                                        | Sats                                   | Metode            | Grundlag          |
| ----------------------------------------------------------- | -------------------------------------- | ----------------- | ----------------- |
| Bygning                                                     | ~~4%~~ **Ikke afskrivningsberettiget** | –                 | –                 |
| Inventar/installationer (løsøre, fx ved møbleret udlejning) | 25%                                    | Saldo             | Afskrivningssaldo |
| Vedligeholdelse                                             | 100%                                   | Straksafskrivning | Faktisk udgift    |

> **Afklaret**: Bygningen kan ikke afskrives, da lejligheden anvendes til beboelse – afskrivningsloven § 14, stk. 2, nr. 4 undtager beboelsesejendomme fra bygningsafskrivning (uanset erhvervsmæssig udlejning/VSO). Se [SKATTEREGLER.md](./SKATTEREGLER.md) for kilder. Appen skal derfor
> **ikke** tilbyde bygningsafskrivning som fradrag for denne lejlighed.

- **I appen**: Automatisk beregning baseret på lejlighedens stamdata og inventarliste (kun løsøre/driftsmidler, ikke selve bygningen)

---

### Fradragsberettigede udgifter

| Udgift                    | Fradrag   | Note                      |
| ------------------------- | --------- | ------------------------- |
| Ejerforeningsbidrag       | 100%      | Løbende driftsudgift      |
| Grundskyld (ejendomsskat) | 100%      | Løbende driftsudgift      |
| Forsikring                | 100%      | Løbende driftsudgift      |
| Realkreditrenter          | 100%      | Finansieringsudgift       |
| Realkreditbidrag          | 100%      | Finansieringsudgift       |
| Vedligeholdelse (løbende) | 100%      | Straksafskrivning         |
| Større forbedringer       | Afskrives | 4-25% afhængig af type    |
| Revisor/regnskab          | 100%      | Administrationsomkostning |

---

### Bankkonto-afstemning

- Din hustru har en **dedikeret bankkonto** til lejligheden
- Appen understøtter manuel afstemning: sammenhold bogførte transaktioner med kontoudtog
- ✅ CSV fra netbank: `src/components/CsvImport.vue` (i Bogføring) uploader en CSV-fil, viser en forhåndsvisning med redigerbar type/kategori pr. linje, markerer mulige duplikater mod eksisterende posteringer, og importerer med ét klik. Parseren (
  `src/utils/bankCsv.js`) håndterer dansk talformat, DD.MM.YYYY-datoer og både UTF-8- og Windows-1252-kodede filer

---

## Projektstruktur (foreslået)

```
lejlighedsudlejning-regnskab/
├── src/
│   ├── db/          # Dexie.js database-schema og queries
│   ├── views/       # Sider: Dashboard, Bogføring, VSO, Rapporter
│   ├── components/  # Genanvendelige komponenter
│   └── App.vue
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

---

## Todos (implementeringsrækkefølge)

1. ✅ **Projektopsætning** – scaffold Vue.js frontend + Vite + Dexie.js (ingen backend), Husky + commitlint (Conventional Commits)
2. ✅ **Database-schema** – Dexie-tabeller: property, tenants, transactions, vsoSettings (`src/db/index.js`)
3. ✅ **Backup/eksport-modul** – JSON-eksport/import af hele databasen via `dexie-export-import` (`src/db/backup.js`, UI i `StamdataView.vue`)
4. ✅ **Stamdata-modul** – CRUD for lejlighed og lejere (`src/views/StamdataView.vue`, `src/composables/useProperty.js`, `src/composables/useTenants.js`)
5. ✅ **Bogføring-modul** – registrering af indtægter og udgifter (`src/views/BogforingView.vue`, `src/composables/useTransactions.js`). **Faste posteringer** (
   `src/composables/useRecurringTransactions.js`): tilbagevendende poster (husleje, ejerforening, forsikring m.fl.) oprettes som skabeloner, og appen viser og opretter manglende perioder med ét klik. Ved oprettelse af en lejer i Stamdata genereres automatisk en husleje-skabelon og en engangspostering for depositum. Der findes desuden en tredje posteringstype,
   **"Hævning (privat)"
   **, adskilt fra indtægt/udgift – en privat overførsel fra virksomhedens til den private økonomi tæller ikke med i resultatopgørelsen, men indgår i hæverækkefølgen på VSO-siden. "Depositum (tilbagebetaling)" og "Anden udgift" er udgiftskategorier (rettet fra en fejl hvor tilbagebetaling af depositum lå under indtægter)
6. ✅ **VSO-beregningsmodul** – kapitalafkast, årets overskud, virksomhedsskat (22%) + **hævningsberegner** koblet til rigtige data fra stamdata/bogføring (`src/views/VsoView.vue`,
   `src/composables/useVsoSettings.js`,
   `src/composables/useVsoBeregning.js`), rentekorrektionsadvarsel ved negativ indskudskonto, 10 Vitest-tests af beregningslogikken. Hævningsberegneren har et 5. trin (foran de fire i VSL § 5): "allerede beskattet beløb til rådighed" fra revisorens opgørelse, som kan hæves uden yderligere skat. Indskudskonto og opsparet overskud (brutto) er nu bekræftede tal fra jeres egen VSO-historik – se SKATTEREGLER.md punkt 2
7. ✅ **Dashboard** – overblik, nøgletal og huslejestatus (`src/views/DashboardView.vue`,
   `src/composables/useHuslejestatus.js`). Estimeret skat er et grovt skøn baseret på maks. marginalsatser, med link videre til VSO-siden for detaljer
8. ✅ **Årsrapport-modul** – resultatopgørelse pr. kategori, skattemæssig opgørelse (VSO) og månedsoversigt (`src/views/RapporterView.vue`)
9. ✅ **PDF-eksport** – "Eksportér til PDF" bruger browserens indbyggede print-til-PDF (`window.print()` + `@media print`-styling), ingen ekstra afhængighed
10. 🔶 **Styling og polish** – konsistent Tailwind-styling og dansk UI/UX er på plads i alle moduler; finpudsning kan ske løbende
