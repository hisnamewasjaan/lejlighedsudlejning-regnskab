# Backlog – idéer og forbedringer

Idéer, forbedringer og mindre justeringer, der ikke er i gang lige nu. Ikke en del af den aktive
plan i [PLAN.md](./PLAN.md) – når noget herfra skal laves, flyttes det til PLAN.md's todo-liste.

Tilføj frit efterhånden som noget dukker op. Ingen fast prioritetsrækkefølge – ryd op og
prioriter, når der er tid til det.

## Idéer

- [ ] **Hjælp til stamdata** – kan systemet selv finde data (lave opslag) pba adresse/bbr eller lign?.
- [ ] **Bankkontoafstemning** – CSV-import findes (Bogføring → "Importér fra netbank"), men selve
      afstemningen (sammenhold bogførte posteringer med kontoudtogets saldo, marker "afstemt")
      mangler stadig.
- [ ] **Bogføringslovens opbevaringskrav** – normalt 5 år, men ikke undersøgt hvad det konkret
      betyder for backup-rutinen (se SKATTEREGLER.md punkt 8, stadig åbent).
- [ ] **Flere hyppigheder for faste posteringer** – i dag kun månedlig/kvartalsvis/årlig
      (`useRecurringTransactions.js`). Kunne udvides med fx "hver 14. dag".
- [ ] **Genvundne afskrivninger / ejendomsavancebeskatning** ved et evt. fremtidigt salg af
      lejligheden – ikke relevant før et salg er aktuelt (se SKATTEREGLER.md).
- [ ] **Flerårig kapitalafkastsats/rentekorrektionssats-historik** – hvis I nogensinde skal opspare
      under flere forskellige historiske virksomhedsskattesatser (før ca. 2016), håndterer appens
      model i dag kun én flad 22%-sats ved hævning af opsparet overskud.
- [ ] **Styling og polish** – konsistent på tværs af moduler, men kan finpudses løbende (PLAN.md punkt 10).
- [ ] **Slet en ejendom** – kaskade-sletning af dens lejere/posteringer/VSO-tal. Bevidst udeladt fra
      "understøt flere ejendomme" ovenfor, da det er en mere risikabel handling.
- [ ] **Fuldt driftsmiddelkartotek** – hvis afskrivninger på løsøre/driftsmidler bliver relevant
      (fx møbleret udlejning), kunne feltet ovenfor udbygges til en egentlig liste over anskaffede
      aktiver (anskaffelsessum/-dato pr. aktiv), hvor appen selv beregner den nedskrevne saldo og
      årets 25%-afskrivning år for år, inkl. salg/udrangering. Bevidst fravalgt for nu, da det er en
      del mere at bygge og vedligeholde for noget der ikke bruges endnu.
- [ ] **Regne på rentabilitet** af at købe en lejllighed og leje den ud. Prognose..
- [ ] **Værktøj til at beregne tilbagebetaling/merbetaling** i forhold til betalt aconto til forbrug
- [ ] **6 "high severity" sårbarheder fra `npm audit`** – alle med samme rodårsag: `brace-expansion`
      (DoS ved ubegrænset expansion) trukket ind transitivt via
      `minimatch → editorconfig → js-beautify → @vue/test-utils`. Kun i `devDependencies`
      (test-værktøj, ikke en del af det byggede produktionsbundle), så reel risiko er lav – men bør
      ryddes op. `npm audit fix --force` vil _nedgradere_ `@vue/test-utils` fra 2.4.11 til 2.4.0
      (breaking change) for at fjerne kæden, hvilket ikke bør gøres blindt. Afvent i stedet en
      opdateret `@vue/test-utils`-release der selv har opdateret sin `js-beautify`-afhængighed, eller
      undersøg om `js-beautify` kan overrides/pinnes direkte via `overrides` i `package.json`.
