<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useProperty } from '@/composables/useProperty'

const props = defineProps({
  ejendomId: { type: [Number, null], required: true },
})

const ejendomId = computed(() => props.ejendomId)
const { property, save: saveProperty } = useProperty(ejendomId)

const propertyForm = reactive({
  adresse: '',
  bfeNr: '',
  ejendomsvaerdi: null,
  anskaffelsespris: null,
})

watch(
  property,
  (value) => {
    if (!value) {
      return
    }
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
</script>

<template>
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
          "BBR-nummer" findes ikke som selvstændigt opslagsnummer – BFE-nummeret (Bestemt Fast Ejendom) er ejendommens
          faktiske ID. Gratis opslag på adressen på
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
          <a href="https://vurderingsportalen.dk" target="_blank" rel="noopener" class="underline"
            >vurderingsportalen.dk</a
          >
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
          <strong>Dette felt bruges i kapitalafkastgrundlaget</strong> (VSL § 8) – fast ejendom indgår til den kontante
          anskaffelsessum, ikke den løbende ejendomsvurdering.
        </span>
      </div>
      <p class="text-sm text-slate-500 sm:col-span-2">
        Realkreditgæld indtastes på <RouterLink to="/vso" class="underline">VSO-siden</RouterLink>
        for hvert enkelt år (primo året) i stedet for her, da restgælden – og dermed kapitalafkastgrundlaget – ændrer
        sig hvert år, efterhånden som lånet afdrages.
      </p>
      <div class="flex items-center gap-3 sm:col-span-2">
        <button type="submit" class="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">
          Gem lejlighedsoplysninger
        </button>
        <span v-if="propertySaved" class="text-sm text-emerald-600">Gemt</span>
      </div>
    </form>
  </section>
</template>
