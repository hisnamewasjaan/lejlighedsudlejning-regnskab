# Lejlighedsudlejning – regnskab

En lokal, local-first webapp til bogføring og virksomhedsordning (VSO) for udlejning af en enkelt
lejlighed i Danmark. Erstatter en stor del af det manuelle arbejde med årsregnskab, kapitalafkast,
hæverækkefølge og selvangivelse for en udlejningsvirksomhed drevet under virksomhedsordningen.

Byg til ét konkret, virkeligt regnskab – ikke en generel SaaS – men arkitekturen og
skattereglerne er generelle nok til at være et udgangspunkt for andre i samme situation.

## Funktioner

- **Stamdata** – lejlighed og lejere
- **Bogføring** – indtægter, udgifter, private hævninger, faste (tilbagevendende) posteringer,
  CSV-import fra netbank
- **Virksomhedsordningen (VSO)** – kapitalafkastgrundlag, kapitalafkast, årets overskud,
  virksomhedsskat, hæverækkefølge og en hævningsberegner
- **Beregning** – en visuel gennemgang af hele beregningskæden, fra bogføring til de endelige
  TastSelv-rubriktal
- **Rapporter** – resultatopgørelse, skattemæssig opgørelse og månedsoversigt, med PDF-eksport
- **Hjælp til selvangivelse** – rubrik-for-rubrik-oversigt over hvad der skal ind i TastSelv Erhverv
- **Backup** – fuld JSON-eksport/import af databasen

Se [PLAN.md](./PLAN.md) for den fulde modulliste og arkitektur, og
[SKATTEREGLER.md](./SKATTEREGLER.md) for de danske skatteregler (og kildehenvisninger) appens
beregninger bygger på.

## Teknisk stack

- **Frontend**: Vue 3 (Composition API + `<script setup>`) + Vite + Tailwind CSS
- **Database**: IndexedDB via [Dexie.js](https://dexie.org/) – al data ligger i browseren, ingen
  server/backend
- **Test**: [Vitest](https://vitest.dev/) til beregningslogikken, [Playwright](https://playwright.dev/) til e2e-flows
- **Commit-linting**: [Conventional Commits](https://www.conventionalcommits.org/) håndhævet via commitlint + Husky

## Kom i gang

```bash
npm install
npm run dev
```

Åbn derefter den viste `localhost`-adresse. Al data gemmes lokalt i browserens IndexedDB – der er
intet at konfigurere, ingen `.env`, ingen backend at starte.

### Test

```bash
npm test           # unit-tests (Vitest)
npm run test:e2e   # e2e-tests (Playwright, starter selv en dev-server)
```

### Build

```bash
npm run build
```

## Udvikling

Databaseskemaet migrerer automatisk mellem versioner – hver ny version skal om nødvendigt have sin
egen upgrade-funktion; se kommentaren øverst i [`src/db/index.js`](./src/db/index.js) for hvordan.

## Data og privatliv

Appen er local-first: alt regnskabsdata (bogføring, VSO-stamdata, lejeroplysninger) lever udelukkende i din egen browsers IndexedDB og forlader aldrig din maskine. Repoet kun kildekode, dokumentation af de skatteregler appen implementerer, og syntetiske eksempeltal i tests.

## Licens

[MIT](./LICENSE)
