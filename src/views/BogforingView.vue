<script setup>
import { computed, reactive, ref } from 'vue'
import { INDTAEGT_KATEGORIER, UDGIFT_KATEGORIER, useTransactions } from '@/composables/useTransactions'
import {
  HYPPIGHED_LABELS,
  beregnManglendePerioder,
  useRecurringTransactions,
} from '@/composables/useRecurringTransactions'
import CsvImport from '@/components/CsvImport.vue'
import { useValgtEjendom } from '@/composables/useValgtEjendom'
import { formatTal } from '@/utils/format'

const ejendom = useValgtEjendom()
const { transactions, addTransaction, deleteTransaction } = useTransactions()
const { templates, addTemplate, deleteTemplate } = useRecurringTransactions()

const ejendomsTransaktioner = computed(() => transactions.value.filter((t) => t.ejendomId === ejendom.value))
const ejendomsTemplates = computed(() => templates.value.filter((t) => t.ejendomId === ejendom.value))

const kategoriLabels = Object.fromEntries([...INDTAEGT_KATEGORIER, ...UDGIFT_KATEGORIER].map((k) => [k.value, k.label]))

const idag = new Date().toISOString().slice(0, 10)

const emptyTemplateForm = () => ({
  type: 'udgift',
  kategori: UDGIFT_KATEGORIER[0].value,
  belob: null,
  hyppighed: 'maanedlig',
  startDato: idag,
  slutDato: '',
  note: '',
})

const templateForm = reactive(emptyTemplateForm())

const templateKategoriMuligheder = computed(() =>
  templateForm.type === 'indtaegt' ? INDTAEGT_KATEGORIER : UDGIFT_KATEGORIER,
)

function onTemplateTypeChange() {
  templateForm.kategori = templateKategoriMuligheder.value[0].value
}

async function onAddTemplate() {
  if (!templateForm.belob || !templateForm.startDato) return
  await addTemplate({ ...templateForm })
  Object.assign(templateForm, emptyTemplateForm())
}

const manglendePrTemplate = computed(() =>
  ejendomsTemplates.value.map((template) => ({
    template,
    manglende: beregnManglendePerioder({ template, transactions: ejendomsTransaktioner.value, tilDato: idag }),
  })),
)

async function opretManglende(entry) {
  for (const dato of entry.manglende) {
    await addTransaction({
      type: entry.template.type,
      kategori: entry.template.kategori,
      dato,
      belob: entry.template.belob,
      note: entry.template.note ?? '',
      tenantId: entry.template.tenantId,
    })
  }
}

const emptyForm = () => ({
  type: 'indtaegt',
  kategori: INDTAEGT_KATEGORIER[0].value,
  dato: '',
  belob: null,
  note: '',
})

const form = reactive(emptyForm())

const kategoriMuligheder = computed(() => {
  if (form.type === 'indtaegt') return INDTAEGT_KATEGORIER
  if (form.type === 'udgift') return UDGIFT_KATEGORIER
  return []
})

function onTypeChange() {
  form.kategori = kategoriMuligheder.value[0]?.value ?? ''
}

const TYPE_LABELS = { indtaegt: 'Indtægt', udgift: 'Udgift', haevning: 'Hævning (privat)' }
const TYPE_KLASSER = { indtaegt: 'text-emerald-700', udgift: 'text-red-700', haevning: 'text-amber-700' }

const saved = ref(false)

async function onSubmit() {
  if (!form.dato || !form.belob) return
  saved.value = false
  await addTransaction({ ...form })
  Object.assign(form, emptyForm())
  saved.value = true
}

// Depositum ind/ud er hverken indtægt eller udgift, men en gæld til lejeren - holdes uden for
// "Resultat" her, så det matcher driftsresultatet på Rapporter-/VSO-siden.
const aaretsIndtaegter = computed(() =>
  ejendomsTransaktioner.value
    .filter((t) => t.type === 'indtaegt' && t.kategori !== 'depositum')
    .reduce((sum, t) => sum + t.belob, 0),
)
const aaretsUdgifter = computed(() =>
  ejendomsTransaktioner.value
    .filter((t) => t.type === 'udgift' && t.kategori !== 'depositum_tilbagebetaling')
    .reduce((sum, t) => sum + t.belob, 0),
)
const aaretsHaevninger = computed(() =>
  ejendomsTransaktioner.value.filter((t) => t.type === 'haevning').reduce((sum, t) => sum + t.belob, 0),
)
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-semibold">Bogføring</h1>

    <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Indtægter i alt</p>
        <p class="text-xl font-semibold text-emerald-700">{{ formatTal(aaretsIndtaegter) }} kr.</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Udgifter i alt</p>
        <p class="text-xl font-semibold text-red-700">{{ formatTal(aaretsUdgifter) }} kr.</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Resultat</p>
        <p class="text-xl font-semibold">{{ formatTal(aaretsIndtaegter - aaretsUdgifter) }} kr.</p>
      </div>
      <div class="rounded-lg border border-slate-200 bg-white p-4">
        <p class="text-sm text-slate-500">Private hævninger</p>
        <p class="text-xl font-semibold text-amber-700">{{ formatTal(aaretsHaevninger) }} kr.</p>
        <p class="text-xs text-slate-500">Indgår ikke i resultatet – se hæverækkefølgen på VSO-siden.</p>
      </div>
    </section>

    <CsvImport />

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Faste posteringer</h2>
      <p class="mt-1 text-sm text-slate-500">
        Opret tilbagevendende poster (fx husleje, ejerforening, forsikring) én gang, og få listet hvilke perioder der
        mangler at blive registreret.
      </p>

      <ul v-if="ejendomsTemplates.length" class="mt-4 divide-y divide-slate-200">
        <li v-for="entry in manglendePrTemplate" :key="entry.template.id" class="py-3 text-sm">
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
                @click="opretManglende(entry)"
              >
                Opret {{ entry.manglende.length }} manglende
              </button>
              <button class="text-red-600 hover:text-red-800" @click="deleteTemplate(entry.template.id)">
                Slet skabelon
              </button>
            </div>
          </div>
        </li>
      </ul>
      <p v-else class="mt-4 text-sm text-slate-500">Ingen faste posteringer oprettet endnu.</p>

      <form class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onAddTemplate">
        <label class="flex flex-col gap-1 text-sm">
          Type
          <select
            v-model="templateForm.type"
            class="rounded border border-slate-300 px-3 py-2"
            @change="onTemplateTypeChange"
          >
            <option value="indtaegt">Indtægt</option>
            <option value="udgift">Udgift</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Kategori
          <select v-model="templateForm.kategori" class="rounded border border-slate-300 px-3 py-2">
            <option v-for="k in templateKategoriMuligheder" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Beløb pr. gang (kr.)
          <input v-model.number="templateForm.belob" type="number" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Hyppighed
          <select v-model="templateForm.hyppighed" class="rounded border border-slate-300 px-3 py-2">
            <option value="maanedlig">Månedlig</option>
            <option value="kvartalsvis">Kvartalsvis</option>
            <option value="aarlig">Årlig</option>
          </select>
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Start
          <input v-model="templateForm.startDato" type="date" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Slut (valgfri)
          <input v-model="templateForm.slutDato" type="date" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <div class="sm:col-span-2">
          <button type="submit" class="rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Opret fast postering
          </button>
        </div>
      </form>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Registrér postering</h2>
      <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSubmit">
        <label class="flex flex-col gap-1 text-sm">
          Type
          <select v-model="form.type" class="rounded border border-slate-300 px-3 py-2" @change="onTypeChange">
            <option value="indtaegt">Indtægt</option>
            <option value="udgift">Udgift</option>
            <option value="haevning">Hævning (privat)</option>
          </select>
        </label>
        <label v-if="kategoriMuligheder.length" class="flex flex-col gap-1 text-sm">
          Kategori
          <select v-model="form.kategori" class="rounded border border-slate-300 px-3 py-2">
            <option v-for="k in kategoriMuligheder" :key="k.value" :value="k.value">{{ k.label }}</option>
          </select>
        </label>
        <p v-else class="text-sm text-slate-500 sm:col-span-1 sm:self-end">
          Overførsel til privatøkonomi – indgår i hæverækkefølgen (VSL § 5), ikke i resultatopgørelsen.
        </p>
        <label class="flex flex-col gap-1 text-sm">
          Dato
          <input v-model="form.dato" type="date" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Beløb (kr.)
          <input v-model.number="form.belob" type="number" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm sm:col-span-2">
          Note (valgfri)
          <input v-model="form.note" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <div class="flex items-center gap-3 sm:col-span-2">
          <button
            type="submit"
            class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
          >
            Registrér
          </button>
          <span v-if="saved" class="text-sm text-emerald-600">Gemt</span>
        </div>
      </form>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Posteringer</h2>
      <table v-if="ejendomsTransaktioner.length" class="mt-4 w-full text-left text-sm">
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
          <tr v-for="t in ejendomsTransaktioner" :key="t.id">
            <td class="py-2">{{ t.dato }}</td>
            <td class="py-2">
              <span :class="TYPE_KLASSER[t.type]">{{ TYPE_LABELS[t.type] }}</span>
            </td>
            <td class="py-2">{{ kategoriLabels[t.kategori] ?? '–' }}</td>
            <td class="py-2 text-slate-500">{{ t.note }}</td>
            <td class="py-2 text-right">{{ formatTal(t.belob) }} kr.</td>
            <td class="py-2 text-right">
              <button class="text-red-600 hover:text-red-800" @click="deleteTransaction(t.id)">Slet</button>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-else class="mt-4 text-sm text-slate-500">Ingen posteringer endnu.</p>
    </section>
  </div>
</template>
