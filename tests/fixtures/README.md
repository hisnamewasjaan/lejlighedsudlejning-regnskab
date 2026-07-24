# Testfixtures – opdigtede tal

`facit.json` og `posteringer.csv` i denne mappe indeholder **fuldstændigt opdigtede** tal og
navne – ingen personoplysninger, ingen reelle beløb. De er internt konsistente på samme måde som
den rigtige, gitignorede `udlejning 2025/`-mappe (se `.gitignore`), så de samme regnskabstests kan
køre mod dem.

Formålet er at `tests/unit/regnskab-2025.spec.js`, `tests/unit/afstemning-2025.spec.js` og
`e2e/regnskab-2025.spec.js` ikke behøver at springes over i CI/på en frisk klone, blot fordi den
rigtige, private `udlejning 2025/facit.json` ikke findes der. De tre testfiler bruger denne mappe
som fallback, hvis den rigtige, lokale fil mangler – findes den rigtige fil, bruges den i stedet.

Rettes der i disse tests' antagelser om facit-strukturen, skal tallene her holdes internt
konsistente igen (se kommentarerne i de tre testfiler for hvilke sammenhænge der skal holde).
