<script setup>
import { computed } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTenants } from '@/composables/useTenants'
import { useTransactions } from '@/composables/useTransactions'
import { useVsoSettings } from '@/composables/useVsoSettings'
import { beregnAaretsOverskud, beregnKapitalafkast, beregnKapitalafkastgrundlag } from '@/composables/useVsoBeregning'
import { beregnHuslejestatus, findAktivLejer } from '@/composables/useHuslejestatus'
import { useValgtAar } from '@/composables/useValgtAar'
import { formatKr as kr } from '@/utils/format'

const now = new Date()
const aar = useValgtAar()

// For indeværende år vises status frem til nuværende måned; for et afsluttet år vises alle 12
// måneder; for et fremtidigt år er der endnu intet forfaldent.
const tilOgMedMaaned = computed(() => {
  if (aar.value === now.getFullYear()) return now.getMonth() + 1
  return aar.value < now.getFullYear() ? 12 : 0
})

// Hvilken dato skal bruges til at finde den aktive lejer for det valgte år - "i dag" hvis det er
// indeværende år, ellers en repræsentativ dato inde i det valgte (forgangne) år.
const referenceDato = computed(() => {
  if (aar.value === now.getFullYear()) return now
  if (aar.value < now.getFullYear()) return new Date(aar.value, 11, 31)
  return now
})

const { property } = useProperty()
const { tenants } = useTenants()
const { transactions } = useTransactions()
const { settings } = useVsoSettings(aar)

const aaretsTransaktioner = computed(() => transactions.value.filter((t) => t.dato?.startsWith(String(aar.value))))
// Depositum ind/ud er hverken indtægt eller udgift, men en gæld til lejeren, og holdes derfor uden
// for indtægter/udgifter her (ellers ville et modtaget depositum fejlagtigt hæve det viste
// "Årets overskud" og "Estimeret skat" nedenfor).
const aaretsIndtaegter = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori !== 'depositum')
    .reduce((sum, t) => sum + t.belob, 0),
)
const aaretsUdgifter = computed(() =>
  aaretsTransaktioner.value
    .filter((t) => t.type === 'udgift' && t.kategori !== 'depositum_tilbagebetaling')
    .reduce((sum, t) => sum + t.belob, 0),
)

const kapitalafkast = computed(() => {
  if (!settings.value) return 0
  const grundlag = beregnKapitalafkastgrundlag({
    fastEjendomAnskaffelsessum: property.value?.anskaffelsespris ?? 0,
    banksaldo: settings.value.banksaldo ?? 0,
    realkreditgaeld: settings.value.realkreditgaeld ?? 0,
    skyldigtDepositum: settings.value.skyldigtDepositum ?? 0,
    hensatTilSenereHaevning: settings.value.beskattetTilRaadighed ?? 0,
  })
  return beregnKapitalafkast(grundlag, settings.value.kapitalafkastsats ?? 0)
})

const aaretsOverskud = computed(() =>
  beregnAaretsOverskud({
    indtaegter: aaretsIndtaegter.value,
    udgifter: aaretsUdgifter.value,
    kapitalafkast: kapitalafkast.value,
  }),
)

// Grovt skøn baseret på typiske maksimale marginalskatter (se PLAN.md) – ikke en præcis beregning.
// Se VSO-siden for detaljeret beregning inkl. valg om opsparing.
const estimeretSkat = computed(() => kapitalafkast.value * 0.37 + Math.max(0, aaretsOverskud.value) * 0.56)

const aktivLejer = computed(() => findAktivLejer(tenants.value, referenceDato.value))
const huslejestatus = computed(() =>
  beregnHuslejestatus({
    tenant: aktivLejer.value,
    transactions: transactions.value,
    aar: aar.value,
    tilOgMedMaaned: tilOgMedMaaned.value,
  }),
)

</script>

<template>
  <div class="space-y-8">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-semibold">Dashboard – {{ aar }}</h1>
      <label class="flex items-center gap-2 text-sm">
        År
        <input v-model.number="aar" type="number" class="w-24 rounded border border-slate-300 px-2 py-1" />
      </label>
    </div>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Indtægter</p>
        <p class="text-xl font-semibold text-emerald-700">{{ kr(aaretsIndtaegter) }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Udgifter</p>
        <p class="text-xl font-semibold text-red-700">{{ kr(aaretsUdgifter) }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Årets overskud</p>
        <p class="text-xl font-semibold">{{ kr(aaretsOverskud) }}</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Estimeret skat (grovt skøn)</p>
        <p class="text-xl font-semibold">{{ kr(estimeretSkat) }}</p>
      </div>
    </section>
    <p class="text-xs text-slate-500">
      Skatteestimatet bruger maksimale marginalskattesatser og er ikke en præcis beregning – se
      <RouterLink to="/vso" class="underline">VSO-siden</RouterLink> for detaljer og valg om opsparing.
    </p>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Huslejestatus {{ aar }}</h2>
      <p v-if="!aktivLejer" class="mt-2 text-sm text-slate-500">
        Ingen aktiv lejer registreret. Tilføj en lejer under
        <RouterLink to="/stamdata" class="underline">Stamdata</RouterLink>.
      </p>
      <ul v-else class="mt-4 divide-y divide-slate-200">
        <li v-for="m in huslejestatus" :key="m.maaned" class="flex items-center justify-between py-2 text-sm">
          <span class="capitalize">{{ m.label }}</span>
          <span :class="m.status === 'betalt' ? 'text-emerald-700' : 'text-red-700'">
            {{ m.status === 'betalt' ? 'Betalt' : 'Mangler' }} ({{ kr(m.betalt) }} / {{ kr(m.forventet) }})
          </span>
        </li>
      </ul>
    </section>
  </div>
</template>
