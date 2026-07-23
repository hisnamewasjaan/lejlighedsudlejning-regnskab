<script setup>
import { computed } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTransactions } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import { beregnAaretsOverskud, beregnKapitalafkast, beregnKapitalafkastgrundlag } from '@/composables/useVsoBeregning'
import { RUBRIK } from '@/constants/skatRubrikker'
import { useValgtAar } from '@/composables/useValgtAar'
import { formatKr, formatTal } from '@/utils/format'

const aar = useValgtAar()

const { property } = useProperty()
const { transactions } = useTransactions()
const { settings } = useVsoSettings(aar)

const aaretsTransaktioner = computed(() => transactions.value.filter((t) => t.dato?.startsWith(String(aar.value))))

function summer(type, ekskluderKategorier) {
  return aaretsTransaktioner.value
    .filter((t) => t.type === type && !ekskluderKategorier.includes(t.kategori))
    .reduce((sum, t) => sum + t.belob, 0)
}

// Realkreditrenter/-bidrag indtastes samlet på VSO-siden (ét årligt tal fra realkreditinstituttets
// opgørelse), ikke som enkelte bogføringsposter - se SKATTEREGLER.md punkt 9. Evt. ældre
// posteringer i de to kategorier holdes derfor uden for driftsresultatet her også.
const driftsresultat = computed(
  () => summer('indtaegt', ['renteindtaegt']) - summer('udgift', ['realkreditrenter', 'realkreditbidrag']),
)
const renteindtaegterIAlt = computed(() =>
  aaretsTransaktioner.value.filter((t) => t.type === 'indtaegt' && t.kategori === 'renteindtaegt').reduce((sum, t) => sum + t.belob, 0),
)
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
const kapitalafkast = computed(() => beregnKapitalafkast(kapitalafkastgrundlag.value, settings.value?.kapitalafkastsats ?? 0))
const aaretsOverskud = computed(() =>
  beregnAaretsOverskud({
    indtaegter: summer('indtaegt', ['renteindtaegt']) + renteindtaegterIAlt.value,
    udgifter: summer('udgift', ['realkreditrenter', 'realkreditbidrag']) + renteudgifterIAlt.value,
    afskrivninger: settings.value?.afskrivninger ?? 0,
    kapitalafkast: kapitalafkast.value,
  }),
)

const indskudskontoNegativ = computed(() => (settings.value?.indskudskonto ?? 0) < 0)
const rentekorrektion = computed(() =>
  indskudskontoNegativ.value ? Math.abs(settings.value.indskudskonto) * (settings.value?.rentekorrektionssats ?? 0) : 0,
)

const virksomhedsrubrikker = computed(() => [
  {
    rubrik: RUBRIK.overskudVirksomhed,
    post: 'Overskud virksomhed/udlejningsejendom',
    vaerdi: driftsresultat.value,
    handling: 'Indtastes af dig i TastSelv Erhverv, ud fra bogføringen (uden renter).',
  },
  {
    rubrik: RUBRIK.renteindtaegtVirksomhed,
    post: 'Renteindtægt i virksomhed',
    vaerdi: renteindtaegterIAlt.value,
    handling: 'Indtastes af dig i TastSelv Erhverv.',
  },
  {
    rubrik: RUBRIK.renteudgiftVirksomhed,
    post: 'Renteudgifter i virksomhed',
    vaerdi: renteudgifterIAlt.value,
    handling: 'Indtastes af dig i TastSelv Erhverv (renter og bidrag samlet, kun for det/de lån der hører til VSO).',
  },
  {
    rubrik: RUBRIK.kapitalafkast,
    post: 'Kapitalafkast i virksomhedsordningen',
    vaerdi: kapitalafkast.value,
    handling: 'Beregnes automatisk af TastSelv ud fra kapitalafkastgrundlaget – brug tallet her til at kontrollere.',
  },
  {
    rubrik: RUBRIK.indkomstTilVirksomhedsbeskatning,
    post: 'Indkomst til virksomhedsbeskatning',
    vaerdi: aaretsOverskud.value,
    handling: 'Beregnes automatisk af TastSelv – brug tallet her til at kontrollere.',
  },
  {
    rubrik: RUBRIK.rentekorrektion,
    post: 'Rentekorrektion',
    vaerdi: rentekorrektion.value,
    handling: indskudskontoNegativ.value
      ? 'Beregnes automatisk af TastSelv, da indskudskontoen er negativ – brug tallet her til at kontrollere.'
      : 'Ikke relevant – indskudskontoen er ikke negativ.',
  },
  {
    rubrik: RUBRIK.samledeOverfoersler,
    post: 'Samlede overførsler (inkl. private andele og hensat til senere hævning)',
    vaerdi: null,
    handling: 'Beregnes automatisk af TastSelv ud fra dine hævninger i årets løb – ikke beregnet af denne app.',
  },
  {
    rubrik: RUBRIK.indskudskontoUltimo,
    post: 'Indskudskonto ultimo',
    vaerdi: settings.value?.indskudskonto ?? 0,
    handling: 'Kontroller at tallet matcher TastSelv – ændres kun ved indskud i/hævning fra selve indskudskontoen.',
  },
])

const personligeRubrikker = computed(() => [
  {
    rubrik: RUBRIK.renteindtaegtPersonlig,
    post: 'Renteindtægt (personlig, uden for VSO)',
    handling: 'Ikke sporet af denne app – hent evt. fra TastSelv Skatteoplysninger, hvis relevant.',
  },
  {
    rubrik: RUBRIK.renteudgiftRealkredit,
    post: 'Renteudgift, private realkreditlån (uden for VSO)',
    handling:
      'Ikke sporet af denne app – de private lån hører ikke til VSO (se SKATTEREGLER.md punkt 5). Hent tallet fra TastSelv Skatteoplysninger.',
  },
])

const kapitalafkastgrundlagKomponenter = computed(() => [
  { label: 'Anskaffelsessum (fast ejendom)', vaerdi: property.value?.anskaffelsespris ?? 0 },
  { label: 'Banksaldo primo året', vaerdi: settings.value?.banksaldo ?? 0 },
  { label: '− Realkreditgæld primo året', vaerdi: -(settings.value?.realkreditgaeld ?? 0) },
  { label: '− Skyldigt depositum primo året', vaerdi: -(settings.value?.skyldigtDepositum ?? 0) },
  { label: '− Hensat til senere hævning primo året', vaerdi: -(settings.value?.beskattetTilRaadighed ?? 0) },
])
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Hjælp til selvangivelse</h1>
      <label class="flex items-center gap-2 text-sm">
        År
        <input v-model.number="aar" type="number" class="w-24 rounded border border-slate-300 px-2 py-1" />
      </label>
    </div>
    <p class="text-sm text-slate-500">
      Oversigt over de TastSelv-rubrikker der er relevante for virksomhedsordningen for {{ aar }}, med appens
      beregnede værdi og hvad du selv skal gøre med tallet. Se VSO- og Rapport-siden for selve udregningerne.
    </p>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Virksomhedsrubrikker</h2>
      <table class="mt-4 w-full text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-1 pr-4 font-normal">Rubrik</th>
            <th class="py-1 pr-4 font-normal">Post</th>
            <th class="py-1 pr-4 text-right font-normal">Værdi</th>
            <th class="py-1 font-normal">Hvad skal du gøre</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in virksomhedsrubrikker" :key="r.rubrik">
            <td class="py-2 pr-4 align-top text-slate-500">{{ r.rubrik }}</td>
            <td class="py-2 pr-4 align-top">{{ r.post }}</td>
            <td class="py-2 pr-4 align-top text-right whitespace-nowrap">
              {{ r.vaerdi === null ? '–' : formatKr(r.vaerdi) }}
            </td>
            <td class="py-2 align-top text-slate-500">{{ r.handling }}</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Kapitalafkastgrundlagets komponenter</h2>
      <p class="mt-1 text-sm text-slate-500">
        Bruges af TastSelv til selv at beregne kapitalafkastet (rubrik {{ RUBRIK.kapitalafkast }}) – indtastes i
        virksomhedsordnings-modulet som værdier primo året (1. januar {{ aar }}).
      </p>
      <table class="mt-4 w-full text-left text-sm">
        <tbody class="divide-y divide-slate-100">
          <tr v-for="k in kapitalafkastgrundlagKomponenter" :key="k.label">
            <td class="py-1 text-slate-500">{{ k.label }}</td>
            <td class="py-1 text-right">{{ formatKr(k.vaerdi) }}</td>
          </tr>
          <tr class="border-t border-slate-300 font-medium">
            <td class="py-1">= Kapitalafkastgrundlag</td>
            <td class="py-1 text-right">{{ formatKr(kapitalafkastgrundlag) }}</td>
          </tr>
          <tr>
            <td class="py-1 text-slate-500">× Kapitalafkastsats</td>
            <td class="py-1 text-right">{{ formatTal((settings?.kapitalafkastsats ?? 0) * 100) }}%</td>
          </tr>
        </tbody>
      </table>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Personlige rubrikker (uden for VSO)</h2>
      <p class="mt-1 text-sm text-slate-500">
        Vedrører den private bolig og andre forhold, som denne app ikke fører regnskab for.
      </p>
      <table class="mt-4 w-full text-left text-sm">
        <thead class="text-xs text-slate-500">
          <tr>
            <th class="py-1 pr-4 font-normal">Rubrik</th>
            <th class="py-1 pr-4 font-normal">Post</th>
            <th class="py-1 font-normal">Hvad skal du gøre</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="r in personligeRubrikker" :key="r.rubrik">
            <td class="py-2 pr-4 align-top text-slate-500">{{ r.rubrik }}</td>
            <td class="py-2 pr-4 align-top">{{ r.post }}</td>
            <td class="py-2 align-top text-slate-500">{{ r.handling }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
</template>
