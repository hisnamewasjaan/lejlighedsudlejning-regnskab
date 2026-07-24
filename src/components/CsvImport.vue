<script setup>
import { computed, ref } from 'vue'
import { decodeCsvBuffer, foreslaaKategori, parseBankCsv } from '@/utils/bankCsv'
import { INDTAEGT_KATEGORIER, UDGIFT_KATEGORIER, useTransactions } from '@/composables/useTransactions'
import { useValgtEjendom } from '@/composables/useValgtEjendom'

const ejendom = useValgtEjendom()
const { transactions, addTransaction } = useTransactions()

const rows = ref([])
const filnavn = ref('')
const importeret = ref(0)
const importerer = ref(false)

function erDuplikat(row) {
  return transactions.value.some(
    (t) => t.ejendomId === ejendom.value && t.dato === row.dato && Math.abs(t.belob - Math.abs(row.beloeb)) < 0.01,
  )
}

async function onFileChange(event) {
  const file = event.target.files?.[0]
  if (!file) return
  filnavn.value = file.name
  importeret.value = 0

  const tekst = decodeCsvBuffer(await file.arrayBuffer())
  const parsedeRows = parseBankCsv(tekst)

  rows.value = parsedeRows.map((row) => {
    const duplikat = erDuplikat(row)
    const forslag = foreslaaKategori(row)
    return {
      ...row,
      // Linjer med en advarsel (fx realkredit, hvor beløbet sandsynligvis blander renter og
      // afdrag) fravælges som standard - brugeren skal aktivt rette beløbet og medtage linjen.
      medtag: !duplikat && !forslag.advarsel,
      duplikat,
      type: forslag.type,
      kategori: forslag.kategori ?? '',
      advarsel: forslag.advarsel,
    }
  })
}

function kategoriMuligheder(type) {
  if (type === 'indtaegt') return INDTAEGT_KATEGORIER
  if (type === 'udgift') return UDGIFT_KATEGORIER
  return []
}

function onTypeChange(row) {
  const muligheder = kategoriMuligheder(row.type)
  row.kategori = muligheder[0]?.value ?? ''
  row.advarsel = undefined
}

const antalValgt = computed(() => rows.value.filter((r) => r.medtag).length)

async function onImporter() {
  importerer.value = true
  let antal = 0

  for (const row of rows.value) {
    if (!row.medtag) continue
    await addTransaction({
      type: row.type,
      kategori: row.type === 'haevning' ? undefined : row.kategori,
      dato: row.dato,
      belob: Math.abs(row.beloeb),
      note: row.tekst,
    })
    antal++
  }

  importeret.value = antal
  rows.value = []
  filnavn.value = ''
  importerer.value = false
}
</script>

<template>
  <section class="rounded-lg border border-slate-200 bg-white p-6">
    <h2 class="text-lg font-medium">Importér fra netbank</h2>
    <p class="mt-1 text-sm text-slate-500">
      Upload en CSV-fil fra netbanken som alternativ til at indtaste posteringer manuelt. Gennemgå
      forslagene til type/kategori for hver linje, ret beløbet hvis nødvendigt, og fjern
      afkrydsningen for linjer der ikke skal importeres (fx dubletter eller linjer der kræver en
      korrektion, du endnu ikke kender).
    </p>

    <label class="mt-4 inline-block rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
      Vælg CSV-fil
      <input type="file" accept=".csv,text/csv" class="hidden" @change="onFileChange" />
    </label>
    <span v-if="filnavn" class="ml-3 text-sm text-slate-500">{{ filnavn }}</span>

    <p v-if="importeret > 0" class="mt-4 text-sm text-emerald-600">{{ importeret }} postering(er) importeret.</p>

    <div v-if="rows.length" class="mt-4 overflow-x-auto">
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
          <tr v-for="(row, i) in rows" :key="i" :class="row.duplikat ? 'opacity-50' : ''">
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
        @click="onImporter"
      >
        Importér {{ antalValgt }} postering(er)
      </button>
    </div>
  </section>
</template>
