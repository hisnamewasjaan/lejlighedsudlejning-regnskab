<script setup>
import { reactive, ref } from 'vue'
import StamdataLejlighedsoplysninger from '@/components/StamdataLejlighedsoplysninger.vue'
import StamdataLejere from '@/components/StamdataLejere.vue'
import { useEjendomme } from '@/composables/useEjendomme'
import { useValgtEjendom } from '@/composables/useValgtEjendom'
import { eksporterBackup, importerBackup } from '@/db/backup'

const { ejendomme, addEjendom } = useEjendomme()
const valgtEjendomId = useValgtEjendom()

const emptyNyEjendomForm = () => ({
  adresse: '',
  bfeNr: '',
  ejendomsvaerdi: null,
  anskaffelsespris: null,
})
const nyEjendomForm = reactive(emptyNyEjendomForm())
const visOpretForm = ref(false)

async function onAddEjendom() {
  if (!nyEjendomForm.adresse) {
    return
  }
  await addEjendom({ ...nyEjendomForm })
  Object.assign(nyEjendomForm, emptyNyEjendomForm())
  visOpretForm.value = false
}

const importFejl = ref(null)

async function onImportBackup(event) {
  const file = event.target.files?.[0]
  if (!file) {
    return
  }
  if (!confirm('Import overskriver al eksisterende data i appen med indholdet af backup-filen. Fortsæt?')) {
    event.target.value = ''
    return
  }
  importFejl.value = null
  try {
    await importerBackup(file)
    location.reload()
  } catch (err) {
    importFejl.value = err.message ?? 'Import af backup fejlede.'
  } finally {
    event.target.value = ''
  }
}
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-semibold">Stamdata</h1>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Dine ejendomme</h2>
      <p class="mt-1 text-sm text-slate-500">
        Hver ejendom har sit eget regnskab (lejere, bogføring, VSO-indstillinger). Skift mellem dem her eller i vælgeren
        øverst til højre i menuen.
      </p>

      <ul v-if="ejendomme.length" class="mt-4 divide-y divide-slate-200">
        <li v-for="e in ejendomme" :key="e.id" class="flex items-center justify-between py-2 text-sm">
          <button
            type="button"
            class="text-left hover:underline"
            :class="e.id === valgtEjendomId ? 'font-medium text-slate-900' : 'text-slate-600'"
            @click="valgtEjendomId = e.id"
          >
            {{ e.adresse || 'Unavngivet ejendom' }}
          </button>
          <span v-if="e.id === valgtEjendomId" class="text-xs text-emerald-700">Valgt</span>
        </li>
      </ul>
      <p v-else class="mt-4 text-sm text-slate-500">Ingen ejendomme oprettet endnu.</p>

      <button
        v-if="!visOpretForm"
        type="button"
        class="mt-4 rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
        @click="visOpretForm = true"
      >
        + Opret ny ejendom
      </button>

      <form v-else class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onAddEjendom">
        <label class="flex flex-col gap-1 text-sm">
          Adresse på ny ejendom
          <input v-model="nyEjendomForm.adresse" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          BFE-nummer (valgfrit for nu)
          <input v-model="nyEjendomForm.bfeNr" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <div class="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Opret ejendom
          </button>
          <button type="button" class="text-sm text-slate-500 hover:text-slate-700" @click="visOpretForm = false">
            Annullér
          </button>
        </div>
        <p class="text-xs text-slate-500 sm:col-span-2">
          Ejendomsværdi og anskaffelsespris kan udfyldes/rettes i "Lejlighedsoplysninger" nedenfor, når ejendommen er
          oprettet og valgt.
        </p>
      </form>
    </section>

    <template v-if="valgtEjendomId">
      <StamdataLejlighedsoplysninger :ejendom-id="valgtEjendomId" />
      <StamdataLejere :ejendom-id="valgtEjendomId" />
    </template>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Backup</h2>
      <p class="mt-1 text-sm text-slate-500">
        Al data ligger kun i browseren. Tag jævnligt en backup, så I ikke mister regnskabet. En backup dækker alle jeres
        ejendomme samlet.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button
          class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          @click="eksporterBackup"
        >
          Eksportér backup
        </button>
        <label class="rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Importér backup
          <input type="file" accept="application/json" class="hidden" @change="onImportBackup" />
        </label>
      </div>
      <p v-if="importFejl" class="mt-3 text-sm text-red-600">{{ importFejl }}</p>
    </section>
  </div>
</template>
