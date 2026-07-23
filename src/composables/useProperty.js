import { ref } from 'vue'
import { db } from '@/db'

export function useProperty() {
  const property = ref(null)
  const loading = ref(true)

  async function load() {
    loading.value = true
    property.value = (await db.property.toCollection().first()) ?? null
    loading.value = false
  }

  async function save(data) {
    if (property.value?.id) {
      await db.property.update(property.value.id, data)
    } else {
      await db.property.add(data)
    }
    await load()
  }

  load()

  return { property, loading, save }
}
