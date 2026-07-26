# vue-mess-detector: undertrykte regler

`vue-mess-detector.json` i denne mappe undertrykker følgende regler pr. fil. JSON understøtter ikke
kommentarer, så begrundelsen står her i stedet:

- **globalStyle** (`RapporterView.vue`, `BeregningView.vue`): `<style>`-blokkene targeter `nav`,
  `body`, `html` – elementer uden for komponentens eget template, som scoped styles ikke kan nå.
  Bevidst print-CSS til PDF-eksport (`window.print()`); `scoped` ville aktivt ødelægge funktionen.
- **computedSideEffects** (`DashboardView.vue`, `RapporterView.vue`): de flaggede "side effects" er
  benigne guard-clauses (`if (!settings.value) return 0`) og en for-løkke der bygger den returnerede
  værdi – ikke reelle sideeffekter. Reglens heuristik er for bred her.
- **elseCondition** (`useProperty.js`, `useTenants.js`, `useVsoSettings.js`): reel gensidigt
  udelukkende branching (isRef-dispatch, update-vs-add), ikke et undgåeligt early-return-mønster –
  tvungen omskrivning ville gøre koden mindre klar, ikke mere.
- **functionSize** (`BogforingView.vue`, `StamdataView.vue`, `e2e/navigation.spec.js`): parser-fejl i
  værktøjet med `() => ({ ... })`-mønsteret (arrow-function der returnerer et objekt-literal) –
  bekræftet ved at læse koden direkte: de flaggede funktioner er reelt 6-8 linjer, ikke de 94-256
  linjer værktøjet rapporterer.

**Efter den strukturelle refaktorering** af `VsoView.vue` (splittet i `useVsoStamdataForm.js`,
`useVsoTransaktionsopsummering.js`, og 4 komponenter i `src/components/vso/`) samt udtrækning af
`BeregningTrin.vue`, `BogforingFasteTemplates.vue`/`BogforingPosteringer.vue`,
`StamdataLejlighedsoplysninger.vue`/`StamdataLejere.vue` og `CsvImportPreviewTabel.vue`, er
fejltallet faldet fra 48 til 10. To af de oprindelige 6 "big v-if"-fund (CsvImport, StamdataView)
forsvandt reelt, fordi parent nu gater hele child-komponenten i stedet for et internt v-if. De
resterende er bevidst undertrykt, samme mønster som ovenfor:

- **bigVif** (`BeregningTrin.vue`, `BogforingFasteTemplates.vue`, `BogforingPosteringer.vue`,
  `vso/HaevningsBeregner.vue`): hver er allerede den mindst meningsfulde komponentgrænse - et
  "liste vs. tom-tilstand"-v-if/v-else. Yderligere splitting ville blot flytte betingelsen ind i
  endnu en fil, ikke fjerne den.
- **functionSize** (`useVsoStamdataForm.js`, `useVsoTransaktionsopsummering.js`): samme årsag som
  `useVsoSettings.js` nedenfor - værktøjet måler hele composable-setup-funktionen som "én funktion".

Bevidst **fortsat ikke** undertrykt (uden for denne refaktorerings scope):
kompleksitet/funktionsstørrelse på `definerSkema` i `src/db/index.js` (bevidst append-only
migrations-mønster, jf. CLAUDE.md) og funktionsstørrelse på `useVsoSettings`-komposablens
setup-funktion (samme årsag som ovenfor, men efterladt synlig som dokumentation af mønsteret), samt
"long script block" på `e2e/navigation.spec.js` (splitting af e2e-specs er en separat beslutning).
