import { isRef, ref, unref, watch } from 'vue'
import { db } from '@/db'

/**
 * @param {import('vue').Ref<number|null> | number | null} ejendomId
 */
export function useTenants(ejendomId) {
  const tenants = ref([])
  const loading = ref(true)

  async function load() {
    const id = unref(ejendomId)
    loading.value = true
    tenants.value =
      id != null
        ? await db.tenants.where('ejendomId').equals(id).sortBy('lejemaalStart').then((r) => r.reverse())
        : []
    loading.value = false
  }

  async function addTenant(data) {
    const id = await db.tenants.add({ ...data, ejendomId: unref(ejendomId) })
    await load()
    return id
  }

  async function updateTenant(id, data) {
    await db.tenants.update(id, data)
    await load()
  }

  async function deleteTenant(id) {
    await db.tenants.delete(id)
    await load()
  }

  if (isRef(ejendomId)) {
    watch(ejendomId, load, { immediate: true })
  } else {
    load()
  }

  return { tenants, loading, addTenant, updateTenant, deleteTenant }
}
