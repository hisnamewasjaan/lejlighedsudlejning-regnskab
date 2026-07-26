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

Bevidst **ikke** undertrykt (strukturelle fund til den planlagte refaktorering af Vue-views):
big v-if (×6), "huge file" på `VsoView.vue`, kompleksitet/funktionsstørrelse på `definerSkema` i
`src/db/index.js` (bevidst append-only migrations-mønster, jf. CLAUDE.md), funktionsstørrelse på
`useVsoSettings`-komposablens setup-funktion, og "long script block" på `e2e/navigation.spec.js`.
