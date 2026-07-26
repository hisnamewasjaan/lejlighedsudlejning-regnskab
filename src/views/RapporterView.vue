<script setup>
import { computed } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTransactions, INDTAEGT_KATEGORIER, UDGIFT_KATEGORIER } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import { beregnAaretsOverskud, beregnKapitalafkast, beregnKapitalafkastgrundlag } from '@/composables/useVsoBeregning'
import { RUBRIK } from '@/constants/skatRubrikker'
import { useValgtAar } from '@/composables/useValgtAar'
import { useValgtEjendom } from '@/composables/useValgtEjendom'
import { formatKr as kr, formatTal } from '@/utils/format'

const aar = useValgtAar()
const ejendom = useValgtEjendom()

const { property } = useProperty(ejendom)
const { transactions } = useTransactions()
const { settings } = useVsoSettings(ejendom, aar)

const aaretsTransaktioner = computed(() =>
  transactions.value.filter((t) => t.ejendomId === ejendom.value && t.dato?.startsWith(String(aar.value))),
)

function summerPrKategori(type, kategorier) {
  return kategorier.map((k) => ({
    label: k.label,
    belob: aaretsTransaktioner.value
      .filter((t) => t.type === type && t.kategori === k.value)
      .reduce((sum, t) => sum + t.belob, 0),
  }))
}

// Renteindtægt/-udgift i virksomheden (TastSelv rubrik 114/117) holdes uden for driftsresultatet
// (rubrik 111) og resultatopgørelsen herunder – de indgår først i "Skattemæssig opgørelse"
// nedenfor, jf. den faktiske rubrikstruktur i TastSelv (se vso-tal.md, bekræftet for 2020-2024).
// Depositum ind/ud er hverken indtægt eller udgift - det er en tilbagebetalingspligtig gæld til
// lejeren (samme princip som "skyldigt depositum" i kapitalafkastgrundlaget) og holdes derfor helt
// uden for både driftsresultatet og årets overskud, uden at blive lagt til igen som renterne gør.
const DRIFT_INDTAEGT_KATEGORIER = INDTAEGT_KATEGORIER.filter(
  (k) => k.value !== 'renteindtaegt' && k.value !== 'depositum',
)
const DRIFT_UDGIFT_KATEGORIER = UDGIFT_KATEGORIER.filter(
  (k) => k.value !== 'realkreditrenter' && k.value !== 'realkreditbidrag' && k.value !== 'depositum_tilbagebetaling',
)

const indtaegtsLinjer = computed(() =>
  summerPrKategori('indtaegt', DRIFT_INDTAEGT_KATEGORIER).filter((l) => l.belob !== 0),
)
const udgiftsLinjer = computed(() => summerPrKategori('udgift', DRIFT_UDGIFT_KATEGORIER).filter((l) => l.belob !== 0))

const indtaegterIAlt = computed(() => indtaegtsLinjer.value.reduce((sum, l) => sum + l.belob, 0))
const udgifterIAlt = computed(() => udgiftsLinjer.value.reduce((sum, l) => sum + l.belob, 0))
const driftsresultat = computed(() => indtaegterIAlt.value - udgifterIAlt.value)

const renteindtaegterIAlt = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori === 'renteindtaegt')
    .reduce((sum, t) => sum + t.belob, 0),
)
// Indtastes samlet på VSO-siden (ét årligt tal fra realkreditinstituttets opgørelse) frem for at
// blive afledt af enkelte bogføringsposter - se SKATTEREGLER.md punkt 9.
const renteudgifterIAlt = computed(() => settings.value?.realkreditrenterOgBidrag ?? 0)

const kapitalafkastgrundlag = computed(() =>
  beregnKapitalafkastgrundlag({
    fastEjendomAnskaffelsessum: property.value?.anskaffelsespris ?? 0,
    banksaldo: settings.value?.banksaldo ?? 0,
    realkreditgaeld: settings.value?.realkreditgaeld ?? 0,
    skyldigtDepositum: settings.value?.skyldigtDepositum ?? 0,
    hensatTilSenereHaevning: settings.value?.beskattetTilRaadighed ?? 0,
  }),
)
const kapitalafkast = computed(() =>
  beregnKapitalafkast(kapitalafkastgrundlag.value, settings.value?.kapitalafkastsats ?? 0),
)
const aaretsOverskud = computed(() =>
  beregnAaretsOverskud({
    indtaegter: indtaegterIAlt.value + renteindtaegterIAlt.value,
    udgifter: udgifterIAlt.value + renteudgifterIAlt.value,
    afskrivninger: settings.value?.afskrivninger ?? 0,
    kapitalafkast: kapitalafkast.value,
  }),
)

const maanedsoversigt = computed(() => {
  const maaneder = Array.from({ length: 12 }, (_, i) => ({
    maaned: i + 1,
    indtaegter: 0,
    udgifter: 0,
  }))
  for (const t of aaretsTransaktioner.value) {
    if (t.kategori === 'depositum' || t.kategori === 'depositum_tilbagebetaling') continue
    const maaned = Number(t.dato.slice(5, 7))
    const linje = maaneder[maaned - 1]
    if (!linje) continue
    if (t.type === 'indtaegt') linje.indtaegter += t.belob
    else linje.udgifter += t.belob
  }
  return maaneder
})

const MAANEDSNAVNE = [
  'Januar',
  'Februar',
  'Marts',
  'April',
  'Maj',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'December',
]

function eksporterPdf() {
  window.print()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between print:hidden">
      <h1 class="text-2xl font-semibold">Rapporter</h1>
      <div class="flex items-center gap-4">
        <label class="flex items-center gap-2 text-sm">
          År
          <input v-model.number="aar" type="number" class="w-24 rounded border border-slate-300 px-2 py-1" />
        </label>
        <button
          class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          @click="eksporterPdf"
        >
          Eksportér til PDF
        </button>
      </div>
    </div>

    <div id="rapport-print">
      <h2 class="text-xl font-semibold">Årsrapport {{ aar }}</h2>
      <p v-if="property?.adresse" class="text-sm text-slate-500">{{ property.adresse }}</p>

      <section class="mt-6 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h3 class="text-lg font-medium">Resultatopgørelse</h3>
        <table class="mt-4 w-full text-left text-sm">
          <tbody>
            <tr v-for="l in indtaegtsLinjer" :key="l.label">
              <td class="py-1">{{ l.label }}</td>
              <td class="py-1 text-right">{{ kr(l.belob) }}</td>
            </tr>
            <tr class="border-t border-slate-200 font-medium">
              <td class="py-1">Indtægter i alt</td>
              <td class="py-1 text-right">{{ kr(indtaegterIAlt) }}</td>
            </tr>
            <tr v-for="l in udgiftsLinjer" :key="l.label">
              <td class="py-1">{{ l.label }}</td>
              <td class="py-1 text-right">−{{ kr(l.belob) }}</td>
            </tr>
            <tr class="border-t border-slate-200 font-medium">
              <td class="py-1">Udgifter i alt</td>
              <td class="py-1 text-right">−{{ kr(udgifterIAlt) }}</td>
            </tr>
            <tr class="border-t-2 border-slate-400 text-base font-semibold">
              <td class="py-2">Driftsresultat</td>
              <td class="py-2 text-right">{{ kr(driftsresultat) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3 text-xs text-slate-500">
          De enkelte kategorier indberettes ikke hver for sig til SKAT – driftsresultatet indgår samlet i rubrik
          {{ RUBRIK.overskudVirksomhed }} (Overskud virksomhed/udlejningsejendom). Renteindtægter og -udgifter i
          virksomheden holdes uden for driftsresultatet her og vises i stedet for sig selv nedenfor (rubrik
          {{ RUBRIK.renteindtaegtVirksomhed }} og {{ RUBRIK.renteudgiftVirksomhed }}), da TastSelv opgør dem særskilt
          fra rubrik {{ RUBRIK.overskudVirksomhed }}.
        </p>
      </section>

      <section class="mt-6 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h3 class="text-lg font-medium">Skattemæssig opgørelse (VSO)</h3>
        <table class="mt-4 w-full text-left text-sm">
          <thead class="text-xs text-slate-500">
            <tr>
              <th class="py-1 text-left font-normal">Post</th>
              <th class="py-1 text-left font-normal">TastSelv-rubrik</th>
              <th class="py-1 text-right font-normal">Beløb</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td class="py-1 text-slate-500">Kapitalafkastgrundlag</td>
              <td class="py-1 text-slate-500">–</td>
              <td class="py-1 text-right">{{ kr(kapitalafkastgrundlag) }}</td>
            </tr>
            <tr class="border-t border-slate-200">
              <td class="py-1 text-slate-500">× Kapitalafkastsats</td>
              <td class="py-1 text-slate-500">–</td>
              <td class="py-1 text-right">{{ formatTal((settings?.kapitalafkastsats ?? 0) * 100) }}%</td>
            </tr>
            <tr class="border-t border-slate-300 font-medium">
              <td class="py-1">= Kapitalafkast (beskattes som kapitalindkomst)</td>
              <td class="py-1 text-sm font-normal text-slate-500">{{ RUBRIK.kapitalafkast }}</td>
              <td class="py-1 text-right">{{ kr(kapitalafkast) }}</td>
            </tr>
            <tr class="border-t-2 border-slate-400">
              <td class="py-2 pt-4">Driftsresultat (fra resultatopgørelsen ovenfor)</td>
              <td class="py-2 pt-4 text-sm text-slate-500">{{ RUBRIK.overskudVirksomhed }}</td>
              <td class="py-2 pt-4 text-right">{{ kr(driftsresultat) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">+ Renteindtægt i virksomhed</td>
              <td class="py-1 text-sm text-slate-500">{{ RUBRIK.renteindtaegtVirksomhed }}</td>
              <td class="py-1 text-right">{{ kr(renteindtaegterIAlt) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Renteudgift og -bidrag i virksomhed</td>
              <td class="py-1 text-sm text-slate-500">{{ RUBRIK.renteudgiftVirksomhed }}</td>
              <td class="py-1 text-right">−{{ kr(renteudgifterIAlt) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Afskrivninger</td>
              <td class="py-1 text-sm text-slate-500">–</td>
              <td class="py-1 text-right">−{{ kr(settings?.afskrivninger ?? 0) }}</td>
            </tr>
            <tr>
              <td class="py-1 text-slate-500">− Kapitalafkast (fra ovenfor)</td>
              <td class="py-1 text-sm text-slate-500">{{ RUBRIK.kapitalafkast }}</td>
              <td class="py-1 text-right">−{{ kr(kapitalafkast) }}</td>
            </tr>
            <tr class="border-t border-slate-300 text-base font-semibold">
              <td class="py-2">= Årets overskud (beskattes som personlig indkomst, medmindre opsparet)</td>
              <td class="py-2 text-sm font-normal text-slate-500">{{ RUBRIK.indkomstTilVirksomhedsbeskatning }}</td>
              <td class="py-2 text-right">{{ kr(aaretsOverskud) }}</td>
            </tr>
          </tbody>
        </table>
        <p class="mt-3 text-xs text-slate-500">
          Bygningsafskrivning indgår ikke, da lejligheden anvendes til beboelse (afskrivningsloven § 14, stk. 2, nr. 4 –
          se SKATTEREGLER.md). Valg om opsparing af overskud foretages på VSO-siden.
        </p>
      </section>

      <section class="mt-6 rounded-lg border border-slate-200 bg-white p-6 print:border-0 print:p-0">
        <h3 class="text-lg font-medium">Månedsoversigt</h3>
        <table class="mt-4 w-full text-left text-sm">
          <thead class="text-slate-500">
            <tr>
              <th class="pb-2">Måned</th>
              <th class="pb-2 text-right">Indtægter</th>
              <th class="pb-2 text-right">Udgifter</th>
              <th class="pb-2 text-right">Resultat</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr v-for="m in maanedsoversigt" :key="m.maaned">
              <td class="py-1">{{ MAANEDSNAVNE[m.maaned - 1] }}</td>
              <td class="py-1 text-right">{{ kr(m.indtaegter) }}</td>
              <td class="py-1 text-right">{{ kr(m.udgifter) }}</td>
              <td class="py-1 text-right">{{ kr(m.indtaegter - m.udgifter) }}</td>
            </tr>
          </tbody>
        </table>
      </section>
    </div>
  </div>
</template>

<style>
@media print {
  nav {
    display: none;
  }
  body {
    background: white;
  }
}
</style>
