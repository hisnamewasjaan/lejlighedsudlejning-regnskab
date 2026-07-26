import { isRef, ref, unref, watch } from 'vue'
import { db } from '@/db'

/**
 * @param {import('vue').Ref<number|null> | number | null} ejendomId
 */
export function useProperty(ejendomId) {
  const property = ref(null)
  const loading = ref(true)

  async function load() {
    const id = unref(ejendomId)
    loading.value = true
    property.value = id != null ? ((await db.property.get(id)) ?? null) : null
    loading.value = false
  }

  async function save(data) {
    if (!property.value?.id) {
      return
    }
    await db.property.update(property.value.id, data)
    await load()
  }

  if (isRef(ejendomId)) {
    watch(ejendomId, load, { immediate: true })
  } else {
    load()
  }

  return { property, loading, save }
}
