import { ref } from 'vue'
import { db } from '@/db'

export function useTenants() {
  const tenants = ref([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    tenants.value = await db.tenants.orderBy('lejemaalStart').reverse().toArray()
    loading.value = false
  }

  async function addTenant(data) {
    const id = await db.tenants.add(data)
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

  load()

  return { tenants, loading, addTenant, updateTenant, deleteTenant }
}
