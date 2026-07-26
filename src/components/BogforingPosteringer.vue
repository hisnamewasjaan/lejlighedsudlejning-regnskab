<script setup>
import { formatTal } from '@/utils/format'

defineProps({
  transaktioner: { type: Array, required: true },
  kategoriLabels: { type: Object, required: true },
})

defineEmits(['slet'])

const TYPE_LABELS = { indtaegt: 'Indtægt', udgift: 'Udgift', haevning: 'Hævning (privat)' }
const TYPE_KLASSER = { indtaegt: 'text-emerald-700', udgift: 'text-red-700', haevning: 'text-amber-700' }
</script>

<template>
  <table v-if="transaktioner.length" class="mt-4 w-full text-left text-sm">
    <thead class="text-slate-500">
      <tr>
        <th class="pb-2">Dato</th>
        <th class="pb-2">Type</th>
        <th class="pb-2">Kategori</th>
        <th class="pb-2">Note</th>
        <th class="pb-2 text-right">Beløb</th>
        <th class="pb-2"></th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-200">
      <tr v-for="t in transaktioner" :key="t.id">
        <td class="py-2">{{ t.dato }}</td>
        <td class="py-2">
          <span :class="TYPE_KLASSER[t.type]">{{ TYPE_LABELS[t.type] }}</span>
        </td>
        <td class="py-2">{{ kategoriLabels[t.kategori] ?? '–' }}</td>
        <td class="py-2 text-slate-500">{{ t.note }}</td>
        <td class="py-2 text-right">{{ formatTal(t.belob) }} kr.</td>
        <td class="py-2 text-right">
          <button class="text-red-600 hover:text-red-800" @click="$emit('slet', t.id)">Slet</button>
        </td>
      </tr>
    </tbody>
  </table>
  <p v-else class="mt-4 text-sm text-slate-500">Ingen posteringer endnu.</p>
</template>
