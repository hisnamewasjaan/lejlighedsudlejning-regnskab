<script setup>
import { computed } from 'vue'
import { INDTAEGT_KATEGORIER, UDGIFT_KATEGORIER } from '@/composables/useTransactions'

defineProps({
  importerer: { type: Boolean, required: true },
})

defineEmits(['import'])

const rows = defineModel('rows', { type: Array, required: true })

function kategoriMuligheder(type) {
  if (type === 'indtaegt') {
    return INDTAEGT_KATEGORIER
  }
  if (type === 'udgift') {
    return UDGIFT_KATEGORIER
  }
  return []
}

function onTypeChange(row) {
  const muligheder = kategoriMuligheder(row.type)
  row.kategori = muligheder[0]?.value ?? ''
  row.advarsel = undefined
}

const antalValgt = computed(() => rows.value.filter((r) => r.medtag).length)
</script>

<template>
  <div class="mt-4 overflow-x-auto">
    <table class="w-full min-w-[640px] text-left text-sm">
      <thead class="text-slate-500">
        <tr>
          <th class="pb-2"></th>
          <th class="pb-2">Dato</th>
          <th class="pb-2">Tekst</th>
          <th class="pb-2 text-right">Beløb</th>
          <th class="pb-2">Type</th>
          <th class="pb-2">Kategori</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        <tr v-for="row in rows" :key="row.id" :class="row.duplikat ? 'opacity-50' : ''">
          <td class="py-2"><input v-model="row.medtag" type="checkbox" /></td>
          <td class="py-2 whitespace-nowrap">{{ row.dato }}</td>
          <td class="py-2">
            {{ row.tekst }}
            <span v-if="row.duplikat" class="block text-xs text-amber-600">Findes muligvis allerede</span>
          </td>
          <td class="py-2 text-right whitespace-nowrap">
            <input
              v-model.number="row.beloeb"
              type="number"
              step="0.01"
              class="w-28 rounded border border-slate-300 px-2 py-1 text-right"
            />
          </td>
          <td class="py-2">
            <select v-model="row.type" class="rounded border border-slate-300 px-2 py-1" @change="onTypeChange(row)">
              <option value="indtaegt">Indtægt</option>
              <option value="udgift">Udgift</option>
              <option value="haevning">Hævning (privat)</option>
            </select>
          </td>
          <td class="py-2">
            <select
              v-if="kategoriMuligheder(row.type).length"
              v-model="row.kategori"
              class="rounded border border-slate-300 px-2 py-1"
              @change="row.advarsel = undefined"
            >
              <option v-for="k in kategoriMuligheder(row.type)" :key="k.value" :value="k.value">{{ k.label }}</option>
            </select>
            <span v-else class="text-slate-400">–</span>
            <span v-if="row.advarsel" class="mt-1 block max-w-xs text-xs text-amber-600">{{ row.advarsel }}</span>
          </td>
        </tr>
      </tbody>
    </table>

    <button
      class="mt-4 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      :disabled="antalValgt === 0 || importerer"
      @click="$emit('import')"
    >
      Importér {{ antalValgt }} postering(er)
    </button>
  </div>
</template>
