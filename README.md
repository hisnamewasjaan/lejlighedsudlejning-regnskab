# Lejlighedsudlejning – regnskab

[![CI](https://github.com/hisnamewasjaan/lejlighedsudlejning-regnskab/actions/workflows/ci.yml/badge.svg)](https://github.com/hisnamewasjaan/lejlighedsudlejning-regnskab/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/github/license/hisnamewasjaan/lejlighedsudlejning-regnskab)](./LICENSE)
[![Vue 3](https://img.shields.io/badge/Vue-3-4FC08D?logo=vuedotjs&logoColor=white)](https://vuejs.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Dexie.js](https://img.shields.io/badge/IndexedDB-Dexie.js-FFC107)](https://dexie.org/)
[![Tested with Vitest](https://img.shields.io/badge/unit%20tests-Vitest-6E9F18?logo=vitest&logoColor=white)](https://vitest.dev/)
[![E2E with Playwright](https://img.shields.io/badge/e2e-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Conventional Commits](https://img.shields.io/badge/Conventional%20Commits-1.0.0-FE5196?logo=conventionalcommits&logoColor=white)](https://www.conventionalcommits.org/)

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
