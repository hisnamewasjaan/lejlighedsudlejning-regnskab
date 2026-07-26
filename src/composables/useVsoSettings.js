import { ref, unref, watch } from 'vue'
import { db } from '@/db'

/**
 * @param {import('vue').Ref<number|null> | number | null} ejendomId
 * @param {import('vue').Ref<number> | number} aar Regnskabsår, som en ref hvis den kan skifte reaktivt
 */
export function useVsoSettings(ejendomId, aar) {
  const settings = ref(null)
  const loading = ref(true)

  async function load() {
    const id = unref(ejendomId)
    const currentAar = unref(aar)
    loading.value = true
    settings.value =
      id == null
        ? null
        : ((await db.vsoSettings.where('[ejendomId+aar]').equals([id, currentAar]).first()) ?? {
            ejendomId: id,
            aar: currentAar,
            kapitalafkastsats: 0.02,
            rentekorrektionssats: 0.05,
            indskudskonto: 0,
            opsparetOverskud: 0,
            beskattetTilRaadighed: 0,
            banksaldo: 0,
            skyldigtDepositum: 0,
            realkreditgaeld: 0,
            realkreditrenterOgBidrag: 0,
            afskrivninger: 0,
            opsparValg: 'haev',
          })
    loading.value = false
  }

  async function save(data) {
    const id = unref(ejendomId)
    if (id == null) {
      return
    }
    if (settings.value?.id) {
      await db.vsoSettings.update(settings.value.id, data)
    } else {
      await db.vsoSettings.add({ ...data, ejendomId: id, aar: unref(aar) })
    }
    await load()
  }

  watch([() => unref(ejendomId), () => unref(aar)], load, { immediate: true })

  return { settings, loading, save }
}
