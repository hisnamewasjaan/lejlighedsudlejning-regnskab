import { computed, reactive, ref, watch } from 'vue'

/**
 * @param {import('vue').Ref<object|null>} settings
 * @param {(data: object) => Promise<void>} saveSettings
 */
export function useVsoStamdataForm(settings, saveSettings) {
  const form = reactive({
    kapitalafkastsatsPct: 2,
    rentekorrektionssatsPct: 5,
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

  watch(
    settings,
    (value) => {
      if (!value) {
        return
      }
      form.kapitalafkastsatsPct = (value.kapitalafkastsats ?? 0.02) * 100
      form.rentekorrektionssatsPct = (value.rentekorrektionssats ?? 0.05) * 100
      form.indskudskonto = value.indskudskonto ?? 0
      form.opsparetOverskud = value.opsparetOverskud ?? 0
      form.beskattetTilRaadighed = value.beskattetTilRaadighed ?? 0
      form.banksaldo = value.banksaldo ?? 0
      form.skyldigtDepositum = value.skyldigtDepositum ?? 0
      form.realkreditgaeld = value.realkreditgaeld ?? 0
      form.realkreditrenterOgBidrag = value.realkreditrenterOgBidrag ?? 0
      form.afskrivninger = value.afskrivninger ?? 0
      form.opsparValg = value.opsparValg ?? 'haev'
    },
    { immediate: true },
  )

  const settingsSaved = ref(false)

  async function onSaveSettings() {
    settingsSaved.value = false
    await saveSettings({
      kapitalafkastsats: form.kapitalafkastsatsPct / 100,
      rentekorrektionssats: form.rentekorrektionssatsPct / 100,
      indskudskonto: form.indskudskonto,
      opsparetOverskud: form.opsparetOverskud,
      beskattetTilRaadighed: form.beskattetTilRaadighed,
      banksaldo: form.banksaldo,
      skyldigtDepositum: form.skyldigtDepositum,
      realkreditgaeld: form.realkreditgaeld,
      realkreditrenterOgBidrag: form.realkreditrenterOgBidrag,
      afskrivninger: form.afskrivninger,
      opsparValg: form.opsparValg,
    })
    settingsSaved.value = true
  }

  const indskudskontoNegativ = computed(() => form.indskudskonto < 0)
  const rentekorrektion = computed(() =>
    indskudskontoNegativ.value ? Math.abs(form.indskudskonto) * (form.rentekorrektionssatsPct / 100) : 0,
  )
  const beskattetPrMaaned = computed(() => Math.round(form.beskattetTilRaadighed / 12))

  return { form, settingsSaved, onSaveSettings, indskudskontoNegativ, rentekorrektion, beskattetPrMaaned }
}
