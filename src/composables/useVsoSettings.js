import { isRef, ref, unref, watch } from 'vue'
import { db } from '@/db'

/**
 * @param {import('vue').Ref<number> | number} aar Regnskabsår, som en ref hvis den kan skifte reaktivt
 */
export function useVsoSettings(aar) {
  const settings = ref(null)
  const loading = ref(true)

  async function load() {
    const currentAar = unref(aar)
    loading.value = true
    settings.value =
      (await db.vsoSettings.where('aar').equals(currentAar).first()) ?? {
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
      }
    loading.value = false
  }

  async function save(data) {
    if (settings.value?.id) {
      await db.vsoSettings.update(settings.value.id, data)
    } else {
      await db.vsoSettings.add({ ...data, aar: unref(aar) })
    }
    await load()
  }

  if (isRef(aar)) {
    watch(aar, load, { immediate: true })
  } else {
    load()
  }

  return { settings, loading, save }
}
