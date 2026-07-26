<script setup>
import { formatKr as kr } from '@/utils/format'

defineProps({
  aar: { type: Number, required: true },
  aaretsHaevninger: { type: Number, required: true },
  haevningResultat: { type: Object, default: null },
})

defineEmits(['beregn'])

const haevningBeloeb = defineModel('haevningBeloeb', { type: [Number, null], default: null })
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-medium">Hævningsberegner</h2>
    <p class="mt-1 text-sm text-slate-500">
      Simulerer hvordan et hævet beløb fordeles efter hæverækkefølgen i VSL § 5.
    </p>
    <p class="mt-2 text-sm text-slate-500">
      Faktiske hævninger bogført i {{ aar }}:
      <span class="font-medium text-slate-700">{{ kr(aaretsHaevninger) }}</span>
    </p>
    <div class="mt-4 flex items-end gap-3">
      <label class="flex flex-col gap-1 text-sm">
        Ønsket hævning (kr.)
        <input v-model.number="haevningBeloeb" type="number" class="w-48 rounded border border-slate-300 px-3 py-2" />
      </label>
      <button
        class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        @click="$emit('beregn')"
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
</template>
