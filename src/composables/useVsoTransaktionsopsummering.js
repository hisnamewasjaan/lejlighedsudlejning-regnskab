import { computed } from 'vue'

// Renteindtægt/-udgift i virksomheden (TastSelv rubrik 114/117) holdes uden for driftsresultatet
// (rubrik 111), men indgår i årets overskud (rubrik 149) – se RapporterView.vue og vso-tal.md.
// Depositum ind/ud er hverken indtægt eller udgift, men en gæld til lejeren (samme princip som
// "skyldigt depositum" i kapitalafkastgrundlaget), og holdes derfor helt uden for begge dele.
// Realkreditrenter og -bidrag bogføres ikke længere som enkelte posteringer (kun kendt som ét
// samlet årligt beløb fra realkreditinstituttets opgørelse), men indtastes samlet i VSO-stamdata -
// se SKATTEREGLER.md. Evt. ældre posteringer i disse to kategorier holdes derfor uden for
// driftsudgifterne, så de ikke tælles dobbelt sammen med det indtastede årlige beløb.
export const IKKE_DRIFT_INDTAEGT_KATEGORIER = ['renteindtaegt', 'depositum']
export const IKKE_DRIFT_UDGIFT_KATEGORIER = ['realkreditrenter', 'realkreditbidrag', 'depositum_tilbagebetaling']

/**
 * @param {import('vue').Ref<Array>} transactions
 * @param {import('vue').Ref<number|null>} ejendom
 * @param {import('vue').Ref<number>} aar
 */
export function useVsoTransaktionsopsummering(transactions, ejendom, aar) {
  const aaretsTransaktioner = computed(() =>
    transactions.value.filter((t) => t.ejendomId === ejendom.value && t.dato?.startsWith(String(aar.value))),
  )

  const aaretsDriftIndtaegter = computed(() =>
    aaretsTransaktioner.value
      .filter((t) => t.type === 'indtaegt' && !IKKE_DRIFT_INDTAEGT_KATEGORIER.includes(t.kategori))
      .reduce((sum, t) => sum + t.belob, 0),
  )
  const aaretsRenteindtaegt = computed(() =>
    aaretsTransaktioner.value
      .filter((t) => t.type === 'indtaegt' && t.kategori === 'renteindtaegt')
      .reduce((sum, t) => sum + t.belob, 0),
  )
  const aaretsDriftUdgifter = computed(() =>
    aaretsTransaktioner.value
      .filter((t) => t.type === 'udgift' && !IKKE_DRIFT_UDGIFT_KATEGORIER.includes(t.kategori))
      .reduce((sum, t) => sum + t.belob, 0),
  )
  const aaretsDriftsresultat = computed(() => aaretsDriftIndtaegter.value - aaretsDriftUdgifter.value)
  const aaretsHaevninger = computed(() =>
    aaretsTransaktioner.value.filter((t) => t.type === 'haevning').reduce((sum, t) => sum + t.belob, 0),
  )

  return {
    aaretsTransaktioner,
    aaretsDriftIndtaegter,
    aaretsRenteindtaegt,
    aaretsDriftUdgifter,
    aaretsDriftsresultat,
    aaretsHaevninger,
  }
}
