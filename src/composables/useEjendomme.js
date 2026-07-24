import { ref } from 'vue'
import { db } from '@/db'
import { useValgtEjendom } from '@/composables/useValgtEjendom'

// Delt (singleton) tilstand, samme mønster som useTenants.js.
const ejendomme = ref([])
const loading = ref(true)

const valgtEjendomId = useValgtEjendom()

async function load() {
  loading.value = true
  ejendomme.value = await db.property.orderBy('adresse').toArray()
  loading.value = false

  // Findes der ejendomme, men ingen er valgt endnu (fx efter migrering fra en tidligere
  // version af appen, der kun kendte til én implicit ejendom), vælges den første automatisk -
  // ellers ville eksisterende brugere ramme en tom tilstand efter opdateringen.
  if (valgtEjendomId.value == null && ejendomme.value.length > 0) {
    valgtEjendomId.value = ejendomme.value[0].id
  }
}

load()

export function useEjendomme() {
  async function addEjendom(data) {
    const id = await db.property.add(data)
    await load()
    valgtEjendomId.value = id
    return id
  }

  return { ejendomme, loading, addEjendom }
}
