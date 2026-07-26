<script setup>
import { ref } from 'vue'
import { decodeCsvBuffer, foreslaaKategori, parseBankCsv } from '@/utils/bankCsv'
import { useTransactions } from '@/composables/useTransactions'
import { useValgtEjendom } from '@/composables/useValgtEjendom'
import CsvImportPreviewTabel from '@/components/CsvImportPreviewTabel.vue'

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
  if (!file) {
    return
  }
  filnavn.value = file.name
  importeret.value = 0

  const tekst = decodeCsvBuffer(await file.arrayBuffer())
  const parsedeRows = parseBankCsv(tekst)

  rows.value = parsedeRows.map((row, i) => {
    const duplikat = erDuplikat(row)
    const forslag = foreslaaKategori(row)
    return {
      ...row,
      // Stabilt id til :key i CsvImportPreviewTabel.vue - tildelt én gang her ved indlæsning,
      // ikke afledt af arrayets aktuelle position (rows kan i teorien blive omarrangeret/filtreret).
      id: i,
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

async function onImporter() {
  importerer.value = true
  let antal = 0

  for (const row of rows.value) {
    if (!row.medtag) {
      continue
    }
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
      Upload en CSV-fil fra netbanken som alternativ til at indtaste posteringer manuelt. Gennemgå forslagene til
      type/kategori for hver linje, ret beløbet hvis nødvendigt, og fjern afkrydsningen for linjer der ikke skal
      importeres (fx dubletter eller linjer der kræver en korrektion, du endnu ikke kender).
    </p>

    <label class="mt-4 inline-block rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
      Vælg CSV-fil
      <input type="file" accept=".csv,text/csv" class="hidden" @change="onFileChange" />
    </label>
    <span v-if="filnavn" class="ml-3 text-sm text-slate-500">{{ filnavn }}</span>

    <p v-if="importeret > 0" class="mt-4 text-sm text-emerald-600">{{ importeret }} postering(er) importeret.</p>

    <CsvImportPreviewTabel v-if="rows.length" v-model:rows="rows" :importerer="importerer" @import="onImporter" />
  </section>
</template>
