<script setup>
import { reactive, ref, watch } from 'vue'
import { useProperty } from '@/composables/useProperty'
import { useTenants } from '@/composables/useTenants'
import { useTransactions } from '@/composables/useTransactions'
import { useRecurringTransactions } from '@/composables/useRecurringTransactions'
import { eksporterBackup, importerBackup } from '@/db/backup'

const { property, save: saveProperty } = useProperty()
const { tenants, addTenant, deleteTenant } = useTenants()
const { addTransaction } = useTransactions()
const { addTemplate: addRecurringTemplate } = useRecurringTransactions()

const propertyForm = reactive({
  adresse: '',
  bfeNr: '',
  ejendomsvaerdi: null,
  anskaffelsespris: null,
})

watch(
  property,
  (value) => {
    if (!value) return
    Object.assign(propertyForm, value)
  },
  { immediate: true },
)

const propertySaved = ref(false)

async function onSaveProperty() {
  propertySaved.value = false
  await saveProperty({ ...propertyForm })
  propertySaved.value = true
}

const tenantForm = reactive({
  navn: '',
  kontakt: '',
  lejemaalStart: '',
  lejemaalSlut: '',
  maanedligHusleje: null,
  depositum: null,
})

async function onAddTenant() {
  if (!tenantForm.navn || !tenantForm.lejemaalStart) return
  const tenantId = await addTenant({ ...tenantForm })

  if (tenantForm.maanedligHusleje) {
    await addRecurringTemplate({
      type: 'indtaegt',
      kategori: 'husleje',
      belob: tenantForm.maanedligHusleje,
      hyppighed: 'maanedlig',
      startDato: tenantForm.lejemaalStart,
      slutDato: tenantForm.lejemaalSlut || '',
      tenantId,
    })
  }

  if (tenantForm.depositum) {
    await addTransaction({
      type: 'indtaegt',
      kategori: 'depositum',
      dato: tenantForm.lejemaalStart,
      belob: tenantForm.depositum,
      note: `Depositum fra ${tenantForm.navn}`,
      tenantId,
    })
  }

  Object.assign(tenantForm, {
    navn: '',
    kontakt: '',
    lejemaalStart: '',
    lejemaalSlut: '',
    maanedligHusleje: null,
    depositum: null,
  })
}

async function onImportBackup(event) {
  const file = event.target.files?.[0]
  if (!file) return
  if (!confirm('Import overskriver al eksisterende data i appen med indholdet af backup-filen. Fortsæt?')) {
    event.target.value = ''
    return
  }
  await importerBackup(file)
  location.reload()
}
</script>

<template>
  <div class="space-y-8">
    <h1 class="text-2xl font-semibold">Stamdata</h1>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Lejlighedsoplysninger</h2>
      <form class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onSaveProperty">
        <label class="flex flex-col gap-1 text-sm">
          Adresse
          <input v-model="propertyForm.adresse" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <div class="flex flex-col gap-1 text-sm">
          <label for="bfe-nr">BFE-nummer</label>
          <input id="bfe-nr" v-model="propertyForm.bfeNr" type="text" class="rounded border border-slate-300 px-3 py-2" />
          <span class="text-xs text-slate-500">
            "BBR-nummer" findes ikke som selvstændigt opslagsnummer – BFE-nummeret (Bestemt Fast
            Ejendom) er ejendommens faktiske ID. Gratis opslag på adressen på
            <a href="https://boligejer.dk" target="_blank" rel="noopener" class="underline">boligejer.dk</a>
            eller
            <a href="https://www.matriklen.dk" target="_blank" rel="noopener" class="underline">matriklen.dk</a>.
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="ejendomsvaerdi">Ejendomsværdi (kr.)</label>
          <input
            id="ejendomsvaerdi"
            v-model.number="propertyForm.ejendomsvaerdi"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Den offentlige ejendomsvurdering – se
            <a href="https://vurderingsportalen.dk" target="_blank" rel="noopener" class="underline">vurderingsportalen.dk</a>
            eller TastSelv → Skatteoplysninger → Ejendomsoplysninger (rubrik 172). Bruges kun til
            reference/ejendomsværdiskat – <strong>ikke</strong> i VSO-beregningen (se Anskaffelsespris).
          </span>
        </div>
        <div class="flex flex-col gap-1 text-sm">
          <label for="anskaffelsespris">Anskaffelsespris (kr.)</label>
          <input
            id="anskaffelsespris"
            v-model.number="propertyForm.anskaffelsespris"
            type="number"
            class="rounded border border-slate-300 px-3 py-2"
          />
          <span class="text-xs text-slate-500">
            Købesummen fra skødet/købsaftalen, eller en ejendomsdatarapport fra
            <a href="https://tinglysning.dk" target="_blank" rel="noopener" class="underline">tinglysning.dk</a>.
            <strong>Dette felt bruges i kapitalafkastgrundlaget</strong> (VSL § 8) – fast ejendom
            indgår til den kontante anskaffelsessum, ikke den løbende ejendomsvurdering.
          </span>
        </div>
        <p class="text-sm text-slate-500 sm:col-span-2">
          Realkreditgæld indtastes på <RouterLink to="/vso" class="underline">VSO-siden</RouterLink>
          for hvert enkelt år (primo året) i stedet for her, da restgælden – og dermed
          kapitalafkastgrundlaget – ændrer sig hvert år, efterhånden som lånet afdrages.
        </p>
        <div class="flex items-center gap-3 sm:col-span-2">
          <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Gem lejlighedsoplysninger
          </button>
          <span v-if="propertySaved" class="text-sm text-emerald-600">Gemt</span>
        </div>
      </form>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Lejere</h2>

      <ul v-if="tenants.length" class="mt-4 divide-y divide-slate-200">
        <li v-for="tenant in tenants" :key="tenant.id" class="flex items-center justify-between py-3 text-sm">
          <div>
            <p class="font-medium">{{ tenant.navn }}</p>
            <p class="text-slate-500">
              {{ tenant.lejemaalStart }} – {{ tenant.lejemaalSlut || 'igangværende' }} ·
              {{ tenant.maanedligHusleje }} kr./md.
            </p>
          </div>
          <button class="text-red-600 hover:text-red-800" @click="deleteTenant(tenant.id)">Slet</button>
        </li>
      </ul>
      <p v-else class="mt-4 text-sm text-slate-500">Ingen lejere registreret endnu.</p>

      <form class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2" @submit.prevent="onAddTenant">
        <label class="flex flex-col gap-1 text-sm">
          Navn
          <input v-model="tenantForm.navn" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Kontakt
          <input v-model="tenantForm.kontakt" type="text" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Lejemål start
          <input v-model="tenantForm.lejemaalStart" type="date" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Lejemål slut (valgfri)
          <input v-model="tenantForm.lejemaalSlut" type="date" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Månedlig husleje (kr.)
          <input v-model.number="tenantForm.maanedligHusleje" type="number" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <label class="flex flex-col gap-1 text-sm">
          Depositum (kr.)
          <input v-model.number="tenantForm.depositum" type="number" class="rounded border border-slate-300 px-3 py-2" />
        </label>
        <div class="sm:col-span-2">
          <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
            Tilføj lejer
          </button>
          <p class="mt-2 text-xs text-slate-500">
            Opretter automatisk en depositum-postering og en tilbagevendende husleje-postering, som kan
            genereres måned for måned under <RouterLink to="/bogforing" class="underline">Bogføring</RouterLink>.
          </p>
        </div>
      </form>
    </section>

    <section class="rounded-lg border border-slate-200 bg-white p-6">
      <h2 class="text-lg font-medium">Backup</h2>
      <p class="mt-1 text-sm text-slate-500">
        Al data ligger kun i browseren. Tag jævnligt en backup, så I ikke mister regnskabet.
      </p>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700" @click="eksporterBackup">
          Eksportér backup
        </button>
        <label class="rounded border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          Importér backup
          <input type="file" accept="application/json" class="hidden" @change="onImportBackup" />
        </label>
      </div>
    </section>
  </div>
</template>
