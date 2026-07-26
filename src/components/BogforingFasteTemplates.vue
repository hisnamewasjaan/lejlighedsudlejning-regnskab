<script setup>
import { HYPPIGHED_LABELS } from '@/composables/useRecurringTransactions'
import { formatTal } from '@/utils/format'

defineProps({
  entries: { type: Array, required: true },
  kategoriLabels: { type: Object, required: true },
})

defineEmits(['opret-manglende', 'slet-template'])
</script>

<template>
  <ul v-if="entries.length" class="mt-4 divide-y divide-slate-200">
    <li v-for="entry in entries" :key="entry.template.id" class="py-3 text-sm">
      <div class="flex items-center justify-between">
        <div>
          <p class="font-medium">
            {{ kategoriLabels[entry.template.kategori] }} · {{ formatTal(entry.template.belob) }} kr. ·
            {{ HYPPIGHED_LABELS[entry.template.hyppighed] }}
          </p>
          <p class="text-slate-500">
            <span v-if="entry.manglende.length === 0">Alle perioder er registreret.</span>
            <span v-else>{{ entry.manglende.length }} manglende periode(r): {{ entry.manglende.join(', ') }}</span>
          </p>
        </div>
        <div class="flex items-center gap-3">
          <button
            v-if="entry.manglende.length"
            class="rounded bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
            @click="$emit('opret-manglende', entry)"
          >
            Opret {{ entry.manglende.length }} manglende
          </button>
          <button class="text-red-600 hover:text-red-800" @click="$emit('slet-template', entry.template.id)">
            Slet skabelon
          </button>
        </div>
      </div>
    </li>
  </ul>
  <p v-else class="mt-4 text-sm text-slate-500">Ingen faste posteringer oprettet endnu.</p>
</template>
