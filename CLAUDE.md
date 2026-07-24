# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A local-first Danish bookkeeping app for a single apartment rental run under *virksomhedsordningen*
(VSO — a Danish tax scheme for sole proprietors). It replaces an accountant for one real, specific
set of books — not a generic multi-tenant SaaS. All data lives in the browser's IndexedDB (via
Dexie.js); there is no backend, no server, no `.env`.

The domain logic (VSO calculations, tax bracket/rubrik mappings, depreciation rules) is Danish tax
law specific and is documented with legal citations in [SKATTEREGLER.md](./SKATTEREGLER.md) and
[PLAN.md](./PLAN.md). Read those before touching anything under `useVsoBeregning.js` or
`skatRubrikker.js` — the comments in that code cite the specific VSL/afskrivningslov paragraphs and
prior-year reconciled figures the formulas are derived from, and changes need the same rigor.

Code, comments, commit messages, and UI copy are in Danish; this file and code comments follow that
convention throughout the repo.

## Commands

```bash
npm run dev        # start Vite dev server
npm run build       # production build
npm run preview     # preview a production build

npm test            # unit tests (Vitest), single run
npm run test:watch  # unit tests, watch mode
npm run test:e2e    # e2e tests (Playwright) — starts its own dev server automatically
```

Run a single unit test file: `npx vitest run tests/unit/useVsoBeregning.spec.js`
Run a single e2e test file: `npx playwright test e2e/regnskab-2025.spec.js`

There is no separate lint script configured. Commit messages are enforced as Conventional Commits
(`feat:`, `fix:`, `chore:`, ...) by commitlint + Husky's `commit-msg` hook — this applies to every
commit, not just CI.

CI (`.github/workflows/ci.yml`) runs on push/PR to `main`: `npm ci` → `npm run build` → unit tests →
Playwright install → e2e tests.

## Architecture

**Stack**: Vue 3 (`<script setup>`, Composition API) + Vite + Tailwind CSS + Dexie.js (IndexedDB).
No router guards, no auth, no API layer — the entire app is client-side against a local database.

**Database** (`src/db/index.js`): a single Dexie database, `LejlighedsudlejningRegnskab`, with four
tables: `property`, `tenants`, `transactions`, `vsoSettings`, `recurringTransactions`. Schema changes
go through Dexie's versioned `db.version(n).stores({...}).upgrade(...)` migrations — each past
version is kept in the file as a permanent record of the migration path (see versions 1-4 for the
pattern: renaming a field, or moving a field from one table to another with an `upgrade` callback
that migrates existing rows). When changing the schema, add a new version block rather than editing
an existing one.

**Composables as the data layer** (`src/composables/`): each domain entity has a `useX.js`
composable that both defines the CRUD operations *and* holds the state, e.g. `useTransactions`,
`useProperty`, `useTenants`, `useVsoSettings`, `useRecurringTransactions`. These use a **module-level
singleton ref**, not per-call local state: the `ref()` is declared outside the exported `useX()`
function, and `load()` runs once at module scope. This is intentional — multiple components mount
independently and call the same composable (e.g. `BogforingView` and `CsvImport` both use
`useTransactions`), and they need to observe the same live list. Follow this pattern for new
composables that back a Dexie table; don't switch to per-instance state.

`useValgtAar.js` is the shared "currently selected year" — also a module singleton, persisted to
`localStorage`, and read across VSO/Rapporter/Dashboard so the whole app stays on the same year.

**Pure calculation modules vs. composables**: `useVsoBeregning.js` is not really a "composable" in
the reactive sense — it's a set of pure functions (`beregnKapitalafkastgrundlag`,
`beregnAaretsOverskud`, `beregnVirksomhedsskat`, `beregnKapitalafkast`, `fordelHaevning`,
`beregnForslagTilHensatNaesteAar`) implementing VSL §§ 3-11. These are the most heavily tested part
of the app (`tests/unit/useVsoBeregning.spec.js`) and were validated against numbers from prior
accountant-prepared tax returns before being trusted for real figures — treat any change here as
tax-correctness-sensitive, not just a refactor.

**Rubrik constants** (`src/constants/skatRubrikker.js`): maps internal calculation results to the
actual TastSelv Erhverv (Danish tax portal) box numbers, so the UI can show the user exactly where a
number should be reconciled/entered. Used by `BeregningView` and `SelvangivelseView`.

**Transaction types**: three distinct kinds live in one `transactions` table, distinguished by a
`type` field — income (`INDTAEGT_KATEGORIER`), expense (`UDGIFT_KATEGORIER`, defined in
`useTransactions.js`), and private withdrawal ("Hævning (privat)"). Withdrawals are deliberately
excluded from the P&L (resultatopgørelse) but feed into the VSO hæverækkefølge (withdrawal-order)
calculation. Deposit repayment (`depositum_tilbagebetaling`) is an *expense* category, not negative
income — this was a deliberate fix, not an oversight (see `PLAN.md` step 5).

**Recurring transactions** (`useRecurringTransactions.js`): templates (e.g. monthly rent, insurance)
that the UI can materialize into concrete `transactions` rows for missing periods on demand, rather
than an auto-generating background job. Creating a tenant in Stamdata auto-creates a rent template
plus a one-off deposit transaction.

**Views map 1:1 to routes** (`src/router/index.js`): Dashboard, Stamdata, Bogføring, VSO, Beregning,
Rapporter, Selvangivelse. `BeregningView` is a read-only, visual walkthrough of the full calculation
chain (bookkeeping → VSO → final tax rubrik numbers) — it doesn't own state, it composes the other
composables/calculation modules to explain how a number was derived.

**CSV import** (`src/utils/bankCsv.js`, `src/components/CsvImport.vue`): parses Danish bank export
CSVs — Danish number format (comma decimal, period thousands), `DD.MM.YYYY` dates, both UTF-8 and
Windows-1252 encodings. The component previews rows with an editable type/category per line and
flags likely duplicates against existing transactions before a one-click import.

**PDF export**: uses the browser's native print-to-PDF (`window.print()` + `@media print` CSS), no
PDF library dependency.

**Testing split**: Vitest unit tests (`tests/unit/`) target calculation/composable logic with jsdom;
Playwright e2e tests (`e2e/`) cover a few critical flows end-to-end (not exhaustive per-button
coverage) — bookkeeping → dashboard, withdrawal calculator, backup export.

**Registry pinning**: `.npmrc` pins `registry=https://registry.npmjs.org/` for this project
specifically, overriding any machine-level private registry config, since all dependencies here are
public.
