<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTransactions } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import {
  beregnAaretsOverskud,
  beregnForslagTilHensatNaesteAar,
  beregnKapitalafkast,
  beregnKapitalafkastgrundlag,
  beregnVirksomhedsskat,
  fordelHaevning,
} from '@/composables/useVsoBeregning'
import { RUBRIK } from '@/constants/skatRubrikker'
import { useValgtAar } from '@/composables/useValgtAar'
import { formatKr as kr } from '@/utils/format'

const aar = useValgtAar()

const { property } = useProperty()
const { transactions } = useTransactions()
const { settings, save: saveSettings } = useVsoSettings(aar)

const form = reactive({
  kapitalafkastsatsPct: 2,
  rentekorrektionssatsPct: 5,
  indskudskonto: 0,
  opsparetOverskud: 0,
  beskattetTilRaadighed: 0,
  banksaldo: 0,
  skyldigtDepositum: 0,
  realkreditgaeld: 0,
  realkreditrenterOgBidrag: 0,
  afskrivninger: 0,
  opsparValg: 'haev',
})

watch(
  settings,
  (value) => {
    if (!value) return
    form.kapitalafkastsatsPct = (value.kapitalafkastsats ?? 0.02) * 100
    form.rentekorrektionssatsPct = (value.rentekorrektionssats ?? 0.05) * 100
    form.indskudskonto = value.indskudskonto ?? 0
    form.opsparetOverskud = value.opsparetOverskud ?? 0
    form.beskattetTilRaadighed = value.beskattetTilRaadighed ?? 0
    form.banksaldo = value.banksaldo ?? 0
    form.skyldigtDepositum = value.skyldigtDepositum ?? 0
    form.realkreditgaeld = value.realkreditgaeld ?? 0
    form.realkreditrenterOgBidrag = value.realkreditrenterOgBidrag ?? 0
    form.afskrivninger = value.afskrivninger ?? 0
    form.opsparValg = value.opsparValg ?? 'haev'
  },
  { immediate: true },
)

const settingsSaved = ref(false)

async function onSaveSettings() {
  settingsSaved.value = false
  await saveSettings({
    kapitalafkastsats: form.kapitalafkastsatsPct / 100,
    rentekorrektionssats: form.rentekorrektionssatsPct / 100,
    indskudskonto: form.indskudskonto,
    opsparetOverskud: form.opsparetOverskud,
    beskattetTilRaadighed: form.beskattetTilRaadighed,
    banksaldo: form.banksaldo,
    skyldigtDepositum: form.skyldigtDepositum,
    realkreditgaeld: form.realkreditgaeld,
    realkreditrenterOgBidrag: form.realkreditrenterOgBidrag,
    afskrivninger: form.afskrivninger,
    opsparValg: form.opsparValg,
  })
  settingsSaved.value = true
}

const aaretsTransaktioner = computed(() =>
  transactions.value.filter((t) => t.dato?.startsWith(String(aar.value))),
)
// Renteindtægt/-udgift i virksomheden (TastSelv rubrik 114/117) holdes uden for driftsresultatet
// (rubrik 111), men indgår i årets overskud (rubrik 149) – se RapporterView.vue og vso-tal.md.
// Depositum ind/ud er hverken indtægt eller udgift, men en gæld til lejeren (samme princip som
// "skyldigt depositum" i kapitalafkastgrundlaget), og holdes derfor helt uden for begge dele.
const aaretsDriftIndtaegter = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori !== 'renteindtaegt' && t.kategori !== 'depositum')
    .reduce((sum, t) => sum + t.belob, 0),
)
const aaretsRenteindtaegt = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori === 'renteindtaegt')
    .reduce((sum, t) => sum + t.belob, 0),
)
// Realkreditrenter og -bidrag bogføres ikke længere som enkelte posteringer (kun kendt som ét
// samlet årligt beløb fra realkreditinstituttets opgørelse), men indtastes samlet i VSO-stamdata
// ovenfor - se SKATTEREGLER.md. Evt. ældre posteringer i disse to kategorier holdes derfor uden
// for driftsudgifterne, så de ikke tælles dobbelt sammen med det indtastede årlige beløb.
const aaretsDriftUdgifter = computed(() =>
  aaretsTransaktioner.value
    .filter(
      (t) =>
        t.type === 'udgift' &&
        t.kategori !== 'realkreditrenter' &&
        t.kategori !== 'realkreditbidrag' &&
        t.kategori !== 'depositum_tilbagebetaling',
    )
    .reduce((sum, t) => sum + t.belob, 0),
)
const aaretsDriftsresultat = computed(() => aaretsDriftIndtaegter.value - aaretsDriftUdgifter.value)
const aaretsHaevninger = computed(() =>
  aaretsTransaktioner.value.filter((t) => t.type === 'haevning').reduce((sum, t) => sum + t.belob, 0),
)

const kapitalafkastgrundlag = computed(() =>
  beregnKapitalafkastgrundlag({
    fastEjendomAnskaffelsessum: property.value?.anskaffelsespris ?? 0,
    banksaldo: form.banksaldo,
    realkreditgaeld: form.realkreditgaeld,
    skyldigtDepositum: form.skyldigtDepositum,
    hensatTilSenereHaevning: form.beskattetTilRaadighed,
  }),
)
const kapitalafkast = computed(() =>
  beregnKapitalafkast(kapitalafkastgrundlag.value, form.kapitalafkastsatsPct / 100),
)
const aaretsOverskud = computed(() =>
  beregnAaretsOverskud({
    indtaegter: aaretsDriftIndtaegter.value + aaretsRenteindtaegt.value,
    udgifter: aaretsDriftUdgifter.value + form.realkreditrenterOgBidrag,
    afskrivninger: form.afskrivninger,
    kapitalafkast: kapitalafkast.value,
  }),
)

const opsparetIAar = computed(() => (form.opsparValg === 'opspar' ? Math.max(0, aaretsOverskud.value) : 0))
const virksomhedsskat = computed(() => beregnVirksomhedsskat(opsparetIAar.value))

const indskudskontoNegativ = computed(() => form.indskudskonto < 0)
const rentekorrektion = computed(() =>
  indskudskontoNegativ.value ? Math.abs(form.indskudskonto) * (form.rentekorrektionssatsPct / 100) : 0,
)

// Forslag til næste års "hensat til senere hævning" (beskattetTilRaadighed primo næste år): den del
// af årets kapitalafkast + overskud, der allerede er beskattet (fordi det ikke er opsparet i VSO),
// men endnu ikke fysisk hævet fra virksomhedens konto. Samme logik som fordelHaevning() bruger til
// at fordele en hævning - her beregnes i stedet resten af "puljen" efter årets faktiske hævninger.
const naesteAar = computed(() => aar.value + 1)
const { settings: naesteAarsSettings, save: gemNaesteAarsSettings } = useVsoSettings(naesteAar)
const forslagTilHensatNaesteAar = computed(() =>
  beregnForslagTilHensatNaesteAar({
    beskattetTilRaadighedPrimo: form.beskattetTilRaadighed,
    kapitalafkast: kapitalafkast.value,
    aaretsOverskud: aaretsOverskud.value,
    opsparetIAar: opsparetIAar.value,
    aaretsHaevninger: aaretsHaevninger.value,
  }),
)

const naesteAarsForslagGemt = ref(false)

async function brugForslagSomNaesteAarsHensat() {
  if (!naesteAarsSettings.value) return
  naesteAarsForslagGemt.value = false
  await gemNaesteAarsSettings({
    ...naesteAarsSettings.value,
    beskattetTilRaadighed: forslagTilHensatNaesteAar.value,
  })
  naesteAarsForslagGemt.value = true
}

const haevningBeloeb = ref(null)
const haevningResultat = ref(null)

function beregnHaevning() {
  if (!haevningBeloeb.value) return
  haevningResultat.value = fordelHaevning(haevningBeloeb.value, {
    beskattetTilRaadighed: form.beskattetTilRaadighed,
    kapitalafkast: kapitalafkast.value,
    aaretsOverskud: Math.max(0, aaretsOverskud.value),
    opsparetOverskud: form.opsparetOverskud,
    indskudskonto: form.indskudskonto,
  })
}

const beskattetPrMaaned = computed(() => Math.round(form.beskattetTilRaadighed / 12))
</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Virksomhedsordningen</h1>
      <label class="flex items-center gap-2 text-sm">
        År
        <input v-model.number="aar" type="number" class="w-24 rounded border border-slate-300 px-2 py-1" />
      </label>
    </div>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">VSO-stamdata for {{ aar }}</h2>
      <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSaveSettings">
        <div class="flex flex-col gap-1 text-sm">
          <label for="kapitalafkastsats">Kapitalafkastsats (%)</label>
          <input
            id="kapitalafkastsats"
            v-model.number="form.kapitalafkastsatsPct"
            type="number"
            step="0.1"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Fastsættes af Skattestyrelsen én gang årligt (VSL § 9) – skal ikke hardcodes, slås op og
            indtastes manuelt hvert år. Se
            <a href="https://info.skat.dk/data.aspx?oid=1948937" target="_blank" rel="noopener" class="underline">
              kapitalafkastsatsen på info.skat.dk
            </a>
            (se også SKATTEREGLER.md).
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="rentekorrektionssats">Rentekorrektionssats (%)</label>
          <input
            id="rentekorrektionssats"
            v-model.number="form.rentekorrektionssatsPct"
            type="number"
            step="0.1"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Fastsættes af Skattestyrelsen én gang årligt (VSL § 11) – bruges kun til beregningen hvis
            indskudskontoen er negativ. Se
            <a href="https://info.skat.dk/data.aspx?oid=1948910" target="_blank" rel="noopener" class="underline">
              rentekorrektionssatsen på info.skat.dk
            </a>
            (se også SKATTEREGLER.md).
          </span>
        </div>
        <label class="flex flex-col gap-1 text-sm">
          Indskudskonto (kr.)
          <input v-model.number="form.indskudskonto" type="number" class="rounded border border-slate-300 px-3 py-2" />
          <span class="text-xs text-slate-500">TastSelv → rubrik {{ RUBRIK.indskudskontoUltimo }} (Indskudskonto ultimo).</span>
        </label>
        <div class="flex flex-col gap-1 text-sm">
          <label for="opsparet-overskud">Opsparet overskud fra tidligere år, bruttobeløb (kr.)</label>
          <input
            id="opsparet-overskud"
            v-model.number="form.opsparetOverskud"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Har ikke et fast rubriknummer – find det under TastSelv → "Fremført til indkomståret →
            Opsparet overskud i virksomhed" (før den betalte virksomhedsskat er trukket fra).
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="banksaldo">Banksaldo primo året (kr.)</label>
          <input id="banksaldo" v-model.number="form.banksaldo" type="number" class="rounded border border-slate-300 px-3 py-2" />
          <span class="text-xs text-slate-500">
            Saldoen på lejlighedskontoen 1. januar – VSL § 8 opgør kapitalafkastgrundlaget ved
            indkomstårets begyndelse, ikke ved udgangen af året.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="realkreditgaeld-vso">Realkreditgæld primo året (kr.)</label>
          <input
            id="realkreditgaeld-vso"
            v-model.number="form.realkreditgaeld"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Restgælden 1. januar (ikke ultimo) på det/de realkreditlån der hører til VSO – find det
            i TastSelv → Skatteoplysninger → "Renteudgifter og restgæld" for det forudgående år.
            Har I flere lån, medregn kun det/de der er overført til virksomhedsindkomsten
            (rubrik 117) – se SKATTEREGLER.md punkt 5.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="skyldigt-depositum">Skyldigt depositum primo året (kr.)</label>
          <input
            id="skyldigt-depositum"
            v-model.number="form.skyldigtDepositum"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Depositum indbetalt af nuværende lejer(e), som skal tilbagebetales – det er en gæld til
            lejeren, ikke en del af lejeindtægten, og trækkes derfor fra i kapitalafkastgrundlaget.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="realkreditrenter-bidrag">Realkreditrenter og -bidrag i alt (kr.)</label>
          <input
            id="realkreditrenter-bidrag"
            v-model.number="form.realkreditrenterOgBidrag"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Årets samlede renter og bidrag på det/de realkreditlån der hører til VSO, ét tal fra
            realkreditinstituttets årsopgørelse. Skattestyrelsen skelner ikke mellem renter og
            bidrag på realkreditlån (begge giver samme fradrag som negativ kapitalindkomst,
            jf. ligningsloven § 5, stk. 1, om "løbende provisioner eller præmier for lån") – kun
            afdraget på hovedstolen skal holdes udenfor. Indtastes som ét samlet årligt beløb i
            stedet for enkelte bogføringsposter, da opgørelsen kun kommer én gang om året. Se
            SKATTEREGLER.md punkt 9.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="afskrivninger">Afskrivninger i alt (kr.)</label>
          <input
            id="afskrivninger"
            v-model.number="form.afskrivninger"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Kun relevant ved driftsmidler (fx møbler/hvidevarer ved møbleret udlejning, saldoafskrivning
            op til 25% årligt) eller aktiverede forbedringer – selve bygningen kan ikke afskrives ved
            beboelsesudlejning (afskrivningsloven § 14, stk. 2, nr. 4, se SKATTEREGLER.md). 0 kr., hvis
            ikke relevant. Beregn selv saldoafskrivningen og indtast kun årets samlede beløb her.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="beskattet-til-raadighed">Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)</label>
          <input
            id="beskattet-til-raadighed"
            v-model.number="form.beskattetTilRaadighed"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Ingen fast TastSelv-rubrik – oplyses typisk af revisoren efter årsafslutning (fx
            "hensat til senere hævning"), beregnet ud fra rubrik {{ RUBRIK.samledeOverfoersler }}
            (Samlede overførsler). Beløb der kan hæves nu uden yderligere skattemæssige konsekvenser.
            Bruges også som fradrag i kapitalafkastgrundlaget (VSL § 8, stk. 1, jf. §§ 4 og 10,
            stk. 1) – skal derfor være beløbet primo året, ikke den løbende saldo.
          </span>
        </div>
        <div class="flex items-center gap-3 sm:col-span-2">
          <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Gem VSO-stamdata
          </button>
          <span v-if="settingsSaved" class="text-sm text-emerald-600">Gemt</span>
        </div>
      </form>

      <p v-if="indskudskontoNegativ" class="mt-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
        Indskudskontoen er negativ. Der beregnes rentekorrektion på {{ kr(rentekorrektion) }} (VSL § 11,
        TastSelv rubrik {{ RUBRIK.rentekorrektion }}).
      </p>

      <p v-if="form.beskattetTilRaadighed > 0" class="mt-4 rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
        Kan hæves i {{ aar }} uden yderligere skat: <span class="font-medium">{{ kr(form.beskattetTilRaadighed) }}</span>
        — svarer til ca. <span class="font-medium">{{ kr(beskattetPrMaaned) }}/måned</span>.
      </p>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Beregning for {{ aar }}</h2>
      <p class="mt-1 text-sm text-slate-500">Sådan fremkommer tallene, trin for trin.</p>

      <div class="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div>
          <h3 class="text-sm font-medium text-slate-700">Kapitalafkastgrundlag (VSL § 8)</h3>
          <table class="mt-2 w-full text-sm">
            <tbody>
              <tr>
                <td class="py-1 text-slate-500">Anskaffelsessum (fast ejendom)</td>
                <td class="py-1 text-right">{{ kr(property?.anskaffelsespris) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">+ Banksaldo</td>
                <td class="py-1 text-right">{{ kr(form.banksaldo) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">− Realkreditgæld</td>
                <td class="py-1 text-right">−{{ kr(form.realkreditgaeld) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">− Skyldigt depositum</td>
                <td class="py-1 text-right">−{{ kr(form.skyldigtDepositum) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">− Hensat til senere hævning</td>
                <td class="py-1 text-right">−{{ kr(form.beskattetTilRaadighed) }}</td>
              </tr>
              <tr class="border-t border-slate-300 font-medium">
                <td class="py-1">= Kapitalafkastgrundlag</td>
                <td class="py-1 text-right">{{ kr(kapitalafkastgrundlag) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-1 text-xs text-slate-500">
            Ingen fast TastSelv-rubrik – beregningsgrundlag for kapitalafkastet. Alle tal skal være
            værdier primo året (1. januar), jf. VSL § 8.
          </p>
          <details class="mt-2 rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            <summary class="cursor-pointer font-medium text-slate-700">
              Sådan beregnes kapitalafkastgrundlaget (VSL § 8, stk. 1)
            </summary>
            <p class="mt-2">Afkastgrundlaget = virksomhedens aktiver minus:</p>
            <ol class="mt-1 list-decimal space-y-1 pl-5">
              <li>Gæld (fx realkreditgæld)</li>
              <li>Beløb afsat efter §§ 4 og 10, stk. 1 ("hensat til senere hævning")</li>
              <li>Indestående på mellemregningskonto (§ 4a) <span class="text-slate-400">– ikke relevant her</span></li>
              <li>Tidligere års beløb efter § 4b, stk. 1 <span class="text-slate-400">– ikke relevant her</span></li>
              <li>Beløb overført fra VSO til privatøkonomien med virkning fra årets begyndelse <span class="text-slate-400">– ikke relevant her</span></li>
            </ol>
            <p class="mt-2">
              Fast ejendom værdiansættes til den kontante anskaffelsessum, ikke den løbende
              offentlige ejendomsvurdering. Alt opgøres primo året (1. januar), ikke ultimo. Se
              SKATTEREGLER.md punkt 6 for kilder og udregning.
            </p>
          </details>
        </div>

        <div>
          <h3 class="text-sm font-medium text-slate-700">
            Kapitalafkast (VSL § 7) <span class="font-normal text-slate-500">– rubrik {{ RUBRIK.kapitalafkast }}</span>
          </h3>
          <table class="mt-2 w-full text-sm">
            <tbody>
              <tr>
                <td class="py-1 text-slate-500">Kapitalafkastgrundlag</td>
                <td class="py-1 text-right">{{ kr(kapitalafkastgrundlag) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">× Kapitalafkastsats</td>
                <td class="py-1 text-right">{{ form.kapitalafkastsatsPct }}%</td>
              </tr>
              <tr class="border-t border-slate-300 font-medium">
                <td class="py-1">= Kapitalafkast</td>
                <td class="py-1 text-right">{{ kr(kapitalafkast) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-1 text-xs text-slate-500">Beskattes som kapitalindkomst, ikke personlig indkomst.</p>
        </div>

        <div>
          <h3 class="text-sm font-medium text-slate-700">Årets overskud (VSL § 10)</h3>
          <table class="mt-2 w-full text-sm">
            <tbody>
              <tr>
                <td class="py-1 text-slate-500">
                  Driftsresultat <span class="text-xs">(rubrik {{ RUBRIK.overskudVirksomhed }})</span>
                </td>
                <td class="py-1 text-right">{{ kr(aaretsDriftsresultat) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">
                  + Renteindtægt i virksomhed <span class="text-xs">(rubrik {{ RUBRIK.renteindtaegtVirksomhed }})</span>
                </td>
                <td class="py-1 text-right">{{ kr(aaretsRenteindtaegt) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">
                  − Renteudgift og -bidrag i virksomhed <span class="text-xs">(rubrik {{ RUBRIK.renteudgiftVirksomhed }})</span>
                </td>
                <td class="py-1 text-right">−{{ kr(form.realkreditrenterOgBidrag) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">− Afskrivninger</td>
                <td class="py-1 text-right">−{{ kr(form.afskrivninger) }}</td>
              </tr>
              <tr>
                <td class="py-1 text-slate-500">− Kapitalafkast <span class="text-xs">(rubrik {{ RUBRIK.kapitalafkast }})</span></td>
                <td class="py-1 text-right">−{{ kr(kapitalafkast) }}</td>
              </tr>
              <tr class="border-t border-slate-300 font-medium">
                <td class="py-1">
                  = Årets overskud <span class="font-normal text-xs text-slate-500">(rubrik {{ RUBRIK.indkomstTilVirksomhedsbeskatning }})</span>
                </td>
                <td class="py-1 text-right">{{ kr(aaretsOverskud) }}</td>
              </tr>
            </tbody>
          </table>
          <p class="mt-1 text-xs text-slate-500">
            Afskrivninger indtastes ovenfor under VSO-stamdata (0 kr., medmindre der er driftsmidler
            eller aktiverede forbedringer – selve bygningen kan ikke afskrives, se SKATTEREGLER.md).
            Driftsresultatet holder renteindtægter/-udgifter uden for sig selv, ligesom i TastSelv –
            de lægges til/trækkes fra særskilt her, jf. vso-tal.md.
          </p>
        </div>
      </div>

      <fieldset class="mt-6">
        <legend class="text-sm font-medium">Skal overskuddet hæves eller opspares?</legend>
        <div class="mt-2 flex gap-4 text-sm">
          <label class="flex items-center gap-2">
            <input v-model="form.opsparValg" type="radio" value="haev" />
            Hæves (beskattes som personlig indkomst)
          </label>
          <label class="flex items-center gap-2">
            <input v-model="form.opsparValg" type="radio" value="opspar" />
            Opspares i VSO (22% foreløbig virksomhedsskat)
          </label>
        </div>
      </fieldset>

      <p v-if="form.opsparValg === 'opspar'" class="mt-4 text-sm">
        Foreløbig virksomhedsskat: <span class="font-medium">{{ kr(virksomhedsskat) }}</span> — netto til rådighed
        for fremtidig hævning: <span class="font-medium">{{ kr(opsparetIAar - virksomhedsskat) }}</span>
      </p>

      <div class="mt-6 rounded border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
        <p class="font-medium">
          Forslag til "Allerede beskattet beløb til rådighed" for {{ naesteAar }}:
          {{ kr(forslagTilHensatNaesteAar) }}
        </p>
        <p class="mt-2 text-xs text-blue-800">
          Beregnet af appen ud fra {{ aar }}: {{ kr(form.beskattetTilRaadighed) }} (hensat primo {{ aar }})
          + {{ kr(kapitalafkast) }} (kapitalafkast)
          + {{ kr(Math.max(0, aaretsOverskud) - opsparetIAar) }} (årets overskud, da det er valgt hævet frem for opsparet)
          − {{ kr(aaretsHaevninger) }} (faktiske hævninger bogført i {{ aar }}).
        </p>
        <p class="mt-2 text-xs text-blue-800">
          Et estimat, ikke et facit – det arver den samme lille unøjagtighed som kapitalafkast- og
          overskudsberegningen ovenfor. Brug det som et startbud for {{ naesteAar }}, og overskriv
          gerne med revisorens bekræftede tal, når det foreligger.
        </p>
        <button
          type="button"
          class="mt-3 rounded bg-blue-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          @click="brugForslagSomNaesteAarsHensat"
        >
          Brug {{ kr(forslagTilHensatNaesteAar) }} som {{ naesteAar }}'s beløb
        </button>
        <span v-if="naesteAarsForslagGemt" class="ml-2 text-sm text-emerald-700">Gemt for {{ naesteAar }}</span>
      </div>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Hævningsberegner</h2>
      <p class="mt-1 text-sm text-slate-500">
        Simulerer hvordan et hævet beløb fordeles efter hæverækkefølgen i VSL § 5.
      </p>
      <p class="mt-2 text-sm text-slate-500">
        Faktiske hævninger bogført i {{ aar }}: <span class="font-medium text-slate-700">{{ kr(aaretsHaevninger) }}</span>
      </p>
      <div class="mt-4 flex items-end gap-3">
        <label class="flex flex-col gap-1 text-sm">
          Ønsket hævning (kr.)
          <input v-model.number="haevningBeloeb" type="number" class="w-48 rounded border border-slate-300 px-3 py-2" />
        </label>
        <button
          class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          @click="beregnHaevning"
        >
          Beregn
        </button>
      </div>

      <dl v-if="haevningResultat" class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <dt class="text-sm text-slate-500">1. Allerede beskattet beløb (skattefrit)</dt>
          <dd class="font-medium">{{ kr(haevningResultat.fordeling.beskattetTilRaadighed) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-slate-500">2. Kapitalafkast (~37% skat)</dt>
          <dd class="font-medium">{{ kr(haevningResultat.fordeling.kapitalafkast) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-slate-500">3. Årets overskud (op til ~56% skat)</dt>
          <dd class="font-medium">{{ kr(haevningResultat.fordeling.aaretsOverskud) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-slate-500">4. Opsparet overskud (restskat, sats − 22%)</dt>
          <dd class="font-medium">{{ kr(haevningResultat.fordeling.opsparetOverskud) }}</dd>
        </div>
        <div>
          <dt class="text-sm text-slate-500">5. Indskudskonto (skattefrit)</dt>
          <dd class="font-medium">{{ kr(haevningResultat.fordeling.indskudskonto) }}</dd>
        </div>
      </dl>
      <p v-if="haevningResultat?.ikkeDaekket > 0" class="mt-3 text-sm text-red-700">
        {{ kr(haevningResultat.ikkeDaekket) }} kan ikke dækkes af de registrerede saldi.
      </p>
    </section>
  </div>
</template>
