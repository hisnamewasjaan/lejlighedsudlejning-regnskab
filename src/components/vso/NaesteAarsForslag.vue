<script setup>
import { formatKr as kr } from '@/utils/format'

defineProps({
  aar: { type: Number, required: true },
  naesteAar: { type: Number, required: true },
  form: { type: Object, required: true },
  kapitalafkast: { type: Number, required: true },
  aaretsOverskud: { type: Number, required: true },
  opsparetIAar: { type: Number, required: true },
  aaretsHaevninger: { type: Number, required: true },
  forslagTilHensatNaesteAar: { type: Number, required: true },
  naesteAarsForslagGemt: { type: Boolean, required: true },
})

defineEmits(['brug-forslag'])
</script>

<template>
  <div class="mt-6 rounded border border-blue-300 bg-blue-50 p-4 text-sm text-blue-900">
    <p class="font-medium">
      Forslag til "Allerede beskattet beløb til rådighed" for {{ naesteAar }}: {{ kr(forslagTilHensatNaesteAar) }}
    </p>
    <p class="mt-2 text-xs text-blue-800">
      Beregnet af appen ud fra {{ aar }}: {{ kr(form.beskattetTilRaadighed) }} (hensat primo {{ aar }}) +
      {{ kr(kapitalafkast) }} (kapitalafkast) + {{ kr(Math.max(0, aaretsOverskud) - opsparetIAar) }} (årets overskud, da
      det er valgt hævet frem for opsparet) − {{ kr(aaretsHaevninger) }} (faktiske hævninger bogført i {{ aar }}).
    </p>
    <p class="mt-2 text-xs text-blue-800">
      Et estimat, ikke et facit – det arver den samme lille unøjagtighed som kapitalafkast- og overskudsberegningen
      ovenfor. Brug det som et startbud for {{ naesteAar }}, og overskriv gerne med revisorens bekræftede tal, når det
      foreligger.
    </p>
    <button
      type="button"
      class="mt-3 rounded bg-blue-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
      @click="$emit('brug-forslag')"
    >
      Brug {{ kr(forslagTilHensatNaesteAar) }} som {{ naesteAar }}'s beløb
    </button>
    <span v-if="naesteAarsForslagGemt" class="ml-2 text-sm text-emerald-700">Gemt for {{ naesteAar }}</span>
  </div>
</template>
