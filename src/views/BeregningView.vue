<script setup>
import { computed } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTransactions } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import {
  beregnAaretsOverskud,
  beregnKapitalafkast,
  beregnKapitalafkastgrundlag,
  beregnVirksomhedsskat,
} from '@/composables/useVsoBeregning'
import { RUBRIK } from '@/constants/skatRubrikker'
import { useValgtAar } from '@/composables/useValgtAar'
import { formatKr as kr } from '@/utils/format'

const aar = useValgtAar()

const { property } = useProperty()
const { transactions } = useTransactions()
const { settings } = useVsoSettings(aar)

const aaretsTransaktioner = computed(() => transactions.value.filter((t) => t.dato?.startsWith(String(aar.value))))

const indtaegterIAlt = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori !== 'renteindtaegt')
    .reduce((sum, t) => sum + t.belob, 0),
)
const udgifterIAlt = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'udgift' && t.kategori !== 'realkreditrenter' && t.kategori !== 'realkreditbidrag')
    .reduce((sum, t) => sum + t.belob, 0),
)
const driftsresultat = computed(() => indtaegterIAlt.value - udgifterIAlt.value)

const renteindtaegterIAlt = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori === 'renteindtaegt')
    .reduce((sum, t) => sum + t.belob, 0),
)
const renteudgifterIAlt = computed(() => settings.value?.realkreditrenterOgBidrag ?? 0)
const afskrivninger = computed(() => settings.value?.afskrivninger ?? 0)

const kapitalafkastgrundlag = computed(() =>
  beregnKapitalafkastgrundlag({
    fastEjendomAnskaffelsessum: property.value?.anskaffelsespris ?? 0,
    banksaldo: settings.value?.banksaldo ?? 0,
    realkreditgaeld: settings.value?.realkreditgaeld ?? 0,
    skyldigtDepositum: settings.value?.skyldigtDepositum ?? 0,
    hensatTilSenereHaevning: settings.value?.beskattetTilRaadighed ?? 0,
  }),
)
const kapitalafkastsats = computed(() => settings.value?.kapitalafkastsats ?? 0)
const kapitalafkast = computed(() => beregnKapitalafkast(kapitalafkastgrundlag.value, kapitalafkastsats.value))

const aaretsOverskud = computed(() =>
  beregnAaretsOverskud({
    indtaegter: indtaegterIAlt.value + renteindtaegterIAlt.value,
    udgifter: udgifterIAlt.value + renteudgifterIAlt.value,
    afskrivninger: afskrivninger.value,
    kapitalafkast: kapitalafkast.value,
  }),
)

const opsparValg = computed(() => settings.value?.opsparValg ?? 'haev')
const opsparetIAar = computed(() => (opsparValg.value === 'opspar' ? Math.max(0, aaretsOverskud.value) : 0))
const virksomhedsskat = computed(() => beregnVirksomhedsskat(opsparetIAar.value))
const nettoTilRaadighed = computed(() => opsparetIAar.value - virksomhedsskat.value)

// Tildeler en fast farve pr. "genbrugt" mellemresultat, så man kan se hvor et tal kommer fra uden
// at tegne reelle forbindelseslinjer på tværs af siden (svært at holde robust ved tekstombrydning/
// responsivt layout). Samme farve + et klikbart "↑ hop til kilden"-link på den genbrugte boks gør
// forbindelsen tydelig alligevel.
const KLEUR = {
  driftsresultat: { borderLeft: 'border-l-sky-400', text: 'text-sky-700' },
  kapitalafkastgrundlag: { borderLeft: 'border-l-violet-400', text: 'text-violet-700' },
  kapitalafkast: { borderLeft: 'border-l-amber-400', text: 'text-amber-700' },
  aaretsOverskud: { borderLeft: 'border-l-emerald-400', text: 'text-emerald-700' },
}

// Hvert "trin" er én ligning: en række input-noder (med fortegn) der fører frem til ét resultat.
// Et tidligere trins resultat går ofte igen som et input i et senere trin - markeret med `kilde`
// (id'et på det trin tallet stammer fra), så det kan farves og linkes tilbage til kilden.
const trin = computed(() => [
  {
    id: 'driftsresultat',
    titel: 'Driftsresultat',
    paragraf: 'Bogføringen',
    inputs: [
      { label: 'Indtægter i alt', vaerdi: indtaegterIAlt.value, fortegn: '' },
      { label: 'Udgifter i alt', vaerdi: udgifterIAlt.value, fortegn: '−' },
    ],
    resultat: { label: 'Driftsresultat', vaerdi: driftsresultat.value, rubrik: RUBRIK.overskudVirksomhed },
  },
  {
    id: 'kapitalafkastgrundlag',
    titel: 'Kapitalafkastgrundlag',
    paragraf: 'VSL § 8',
    inputs: [
      { label: 'Anskaffelsessum (fast ejendom)', vaerdi: property.value?.anskaffelsespris ?? 0, fortegn: '' },
      { label: 'Banksaldo primo året', vaerdi: settings.value?.banksaldo ?? 0, fortegn: '+' },
      { label: 'Realkreditgæld primo året', vaerdi: settings.value?.realkreditgaeld ?? 0, fortegn: '−' },
      { label: 'Skyldigt depositum primo året', vaerdi: settings.value?.skyldigtDepositum ?? 0, fortegn: '−' },
      { label: 'Hensat til senere hævning', vaerdi: settings.value?.beskattetTilRaadighed ?? 0, fortegn: '−' },
    ],
    resultat: { label: 'Kapitalafkastgrundlag', vaerdi: kapitalafkastgrundlag.value },
  },
  {
    id: 'kapitalafkast',
    titel: 'Kapitalafkast',
    paragraf: 'VSL § 7',
    inputs: [
      { label: 'Kapitalafkastgrundlag', vaerdi: kapitalafkastgrundlag.value, fortegn: '', kilde: 'kapitalafkastgrundlag' },
      { label: 'Kapitalafkastsats', vaerdi: kapitalafkastsats.value, fortegn: '×', erProcent: true },
    ],
    resultat: { label: 'Kapitalafkast', vaerdi: kapitalafkast.value, rubrik: RUBRIK.kapitalafkast },
  },
  {
    id: 'aaretsOverskud',
    titel: 'Årets overskud',
    paragraf: 'VSL § 10',
    inputs: [
      { label: 'Driftsresultat', vaerdi: driftsresultat.value, fortegn: '', rubrik: RUBRIK.overskudVirksomhed, kilde: 'driftsresultat' },
      { label: 'Renteindtægt i virksomhed', vaerdi: renteindtaegterIAlt.value, fortegn: '+', rubrik: RUBRIK.renteindtaegtVirksomhed },
      { label: 'Renteudgift og -bidrag i virksomhed', vaerdi: renteudgifterIAlt.value, fortegn: '−', rubrik: RUBRIK.renteudgiftVirksomhed },
      { label: 'Afskrivninger', vaerdi: afskrivninger.value, fortegn: '−' },
      { label: 'Kapitalafkast', vaerdi: kapitalafkast.value, fortegn: '−', rubrik: RUBRIK.kapitalafkast, kilde: 'kapitalafkast' },
    ],
    resultat: { label: 'Årets overskud', vaerdi: aaretsOverskud.value, rubrik: RUBRIK.indkomstTilVirksomhedsbeskatning },
  },
])
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Beregning</h1>
      <label class="flex items-center gap-2 text-sm">
        År
        <input v-model.number="aar" type="number" class="w-24 rounded border border-slate-300 px-2 py-1" />
      </label>
    </div>
    <p class="text-sm text-slate-500">
      Samme tal som på VSO- og Rapport-siden, men vist som en sammenhængende kæde af mellemregninger -
      fra det bogførte til de endelige rubriktal for {{ aar }}. Hævningsberegneren (simulering af en
      konkret hævning) findes stadig på VSO-siden.
    </p>

    <section
      v-for="t in trin"
      :id="`trin-${t.id}`"
      :key="t.titel"
      class="scroll-mt-4 rounded-lg border border-slate-200 bg-white p-6"
    >
      <h2 class="text-sm font-medium text-slate-700">
        {{ t.titel }} <span class="font-normal text-slate-400">({{ t.paragraf }})</span>
      </h2>

      <div class="mt-4 flex flex-wrap justify-center gap-3">
        <component
          :is="input.kilde ? 'a' : 'div'"
          v-for="input in t.inputs"
          :key="input.label"
          :href="input.kilde ? `#trin-${input.kilde}` : undefined"
          class="w-44 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-sm"
          :class="input.kilde ? [KLEUR[input.kilde].borderLeft, 'border-l-4 bg-white hover:bg-slate-50'] : ''"
        >
          <p class="text-xs text-slate-500">
            <span v-if="input.kilde" :class="KLEUR[input.kilde].text">↑ </span>
            {{ input.label }} <span v-if="input.rubrik" class="text-slate-400">(rubrik {{ input.rubrik }})</span>
          </p>
          <p class="font-medium">
            <span
              v-if="input.fortegn"
              :class="{
                'text-emerald-600': input.fortegn === '+',
                'text-red-600': input.fortegn === '−',
                'text-slate-500': input.fortegn === '×',
              }"
            >{{ input.fortegn }}</span>
            {{ input.erProcent ? `${input.vaerdi * 100}%` : kr(input.vaerdi) }}
          </p>
        </component>
      </div>

      <div class="flex justify-center py-2 text-slate-300">
        <svg width="16" height="22" viewBox="0 0 16 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 0 V16 M2 13 L8 19 L14 13" />
        </svg>
      </div>

      <div
        class="mx-auto w-fit rounded-lg border-2 border-slate-400 bg-slate-50 px-4 py-2 text-center shadow-sm"
        :class="KLEUR[t.id] ? [KLEUR[t.id].borderLeft, 'border-l-4'] : ''"
      >
        <p class="text-xs font-medium text-slate-600">
          = {{ t.resultat.label }} <span v-if="t.resultat.rubrik" class="font-normal text-slate-400">(rubrik {{ t.resultat.rubrik }})</span>
        </p>
        <p class="text-lg font-semibold">{{ kr(t.resultat.vaerdi) }}</p>
      </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-sm font-medium text-slate-700">Hæves eller opspares? <span class="font-normal text-slate-400">(VSL § 10)</span></h2>

      <div class="mt-4 flex flex-wrap justify-center gap-4">
        <a
          href="#trin-aaretsOverskud"
          class="w-56 rounded-lg border px-4 py-3 text-center text-sm shadow-sm"
          :class="[
            KLEUR.aaretsOverskud.borderLeft,
            'border-l-4',
            opsparValg === 'haev' ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white opacity-40 hover:opacity-70',
          ]"
        >
          <p class="font-medium text-slate-700">Hæves</p>
          <p class="mt-1 text-xs text-slate-500">Beskattes som personlig indkomst, op til ca. 56%</p>
          <p class="mt-2 text-lg font-semibold">
            <span :class="KLEUR.aaretsOverskud.text">↑</span> {{ kr(aaretsOverskud) }}
          </p>
        </a>
        <a
          href="#trin-aaretsOverskud"
          class="w-56 rounded-lg border px-4 py-3 text-center text-sm shadow-sm"
          :class="[
            KLEUR.aaretsOverskud.borderLeft,
            'border-l-4',
            opsparValg === 'opspar' ? 'border-slate-400 bg-slate-50' : 'border-slate-200 bg-white opacity-40 hover:opacity-70',
          ]"
        >
          <p class="font-medium text-slate-700">Opspares i VSO</p>
          <p class="mt-1 text-xs text-slate-500">
            {{ kr(aaretsOverskud) }} × 22% = {{ kr(virksomhedsskat) }} foreløbig virksomhedsskat
          </p>
          <p class="mt-2 text-lg font-semibold">
            {{ kr(nettoTilRaadighed) }} <span class="text-xs font-normal text-slate-500">netto</span>
          </p>
        </a>
      </div>
      <p class="mt-4 text-center text-xs text-slate-500">
        Valget for {{ aar }} er sat på VSO-siden til "{{ opsparValg === 'opspar' ? 'Opspares' : 'Hæves' }}" -
        den fremhævede boks ovenfor. Farvet kant + <span class="text-emerald-700">↑</span> viser hvor et tal
        kommer fra - klik for at hoppe op til det trin, det er beregnet i.
      </p>
    </section>
  </div>
</template>

<style>
html {
  scroll-behavior: smooth;
}
</style>
