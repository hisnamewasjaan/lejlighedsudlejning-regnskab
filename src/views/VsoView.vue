<script setup>
import { computed, ref } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTransactions } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import { useVsoStamdataForm } from '@/composables/useVsoStamdataForm'
import { useVsoTransaktionsopsummering } from '@/composables/useVsoTransaktionsopsummering'
import {
  beregnAaretsOverskud,
  beregnForslagTilHensatNaesteAar,
  beregnKapitalafkast,
  beregnKapitalafkastgrundlag,
  beregnVirksomhedsskat,
  fordelHaevning,
} from '@/composables/useVsoBeregning'
import { useValgtAar } from '@/composables/useValgtAar'
import { useValgtEjendom } from '@/composables/useValgtEjendom'
import VsoStamdataForm from '@/components/vso/VsoStamdataForm.vue'
import VsoBeregningOversigt from '@/components/vso/VsoBeregningOversigt.vue'
import NaesteAarsForslag from '@/components/vso/NaesteAarsForslag.vue'
import HaevningsBeregner from '@/components/vso/HaevningsBeregner.vue'

const aar = useValgtAar()
const ejendom = useValgtEjendom()

const { property } = useProperty(ejendom)
const { transactions } = useTransactions()
const { settings, save: saveSettings } = useVsoSettings(ejendom, aar)

const { form, settingsSaved, onSaveSettings, indskudskontoNegativ, rentekorrektion, beskattetPrMaaned } =
  useVsoStamdataForm(settings, saveSettings)

const { aaretsDriftIndtaegter, aaretsRenteindtaegt, aaretsDriftUdgifter, aaretsDriftsresultat, aaretsHaevninger } =
  useVsoTransaktionsopsummering(transactions, ejendom, aar)

const kapitalafkastgrundlag = computed(() =>
  beregnKapitalafkastgrundlag({
    fastEjendomAnskaffelsessum: property.value?.anskaffelsespris ?? 0,
    banksaldo: form.banksaldo,
    realkreditgaeld: form.realkreditgaeld,
    skyldigtDepositum: form.skyldigtDepositum,
    hensatTilSenereHaevning: form.beskattetTilRaadighed,
  }),
)
const kapitalafkast = computed(() => beregnKapitalafkast(kapitalafkastgrundlag.value, form.kapitalafkastsatsPct / 100))
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

// Forslag til næste års "hensat til senere hævning" (beskattetTilRaadighed primo næste år): den del
// af årets kapitalafkast + overskud, der allerede er beskattet (fordi det ikke er opsparet i VSO),
// men endnu ikke fysisk hævet fra virksomhedens konto. Samme logik som fordelHaevning() bruger til
// at fordele en hævning - her beregnes i stedet resten af "puljen" efter årets faktiske hævninger.
const naesteAar = computed(() => aar.value + 1)
const { settings: naesteAarsSettings, save: gemNaesteAarsSettings } = useVsoSettings(ejendom, naesteAar)
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
  if (!naesteAarsSettings.value) {
    return
  }
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
  if (!haevningBeloeb.value) {
    return
  }
  haevningResultat.value = fordelHaevning(haevningBeloeb.value, {
    beskattetTilRaadighed: form.beskattetTilRaadighed,
    kapitalafkast: kapitalafkast.value,
    aaretsOverskud: Math.max(0, aaretsOverskud.value),
    opsparetOverskud: form.opsparetOverskud,
    indskudskonto: form.indskudskonto,
  })
}
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

    <VsoStamdataForm
      :form="form"
      :aar="aar"
      :settings-saved="settingsSaved"
      :indskudskonto-negativ="indskudskontoNegativ"
      :rentekorrektion="rentekorrektion"
      :beskattet-pr-maaned="beskattetPrMaaned"
      @save="onSaveSettings"
    />

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <VsoBeregningOversigt
        :aar="aar"
        :form="form"
        :property="property"
        :kapitalafkastgrundlag="kapitalafkastgrundlag"
        :kapitalafkast="kapitalafkast"
        :aarets-driftsresultat="aaretsDriftsresultat"
        :aarets-renteindtaegt="aaretsRenteindtaegt"
        :aarets-overskud="aaretsOverskud"
        :opsparet-i-aar="opsparetIAar"
        :virksomhedsskat="virksomhedsskat"
      />

      <NaesteAarsForslag
        :aar="aar"
        :naeste-aar="naesteAar"
        :form="form"
        :kapitalafkast="kapitalafkast"
        :aarets-overskud="aaretsOverskud"
        :opsparet-i-aar="opsparetIAar"
        :aarets-haevninger="aaretsHaevninger"
        :forslag-til-hensat-naeste-aar="forslagTilHensatNaesteAar"
        :naeste-aars-forslag-gemt="naesteAarsForslagGemt"
        @brug-forslag="brugForslagSomNaesteAarsHensat"
      />
    </section>

    <HaevningsBeregner
      v-model:haevning-beloeb="haevningBeloeb"
      :aar="aar"
      :aarets-haevninger="aaretsHaevninger"
      :haevning-resultat="haevningResultat"
      @beregn="beregnHaevning"
    />
  </div>
</template>
