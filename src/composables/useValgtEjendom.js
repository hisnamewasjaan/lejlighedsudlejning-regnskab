import { ref, watch } from 'vue'

const LAGRET_NOEGLE = 'lejlighedsudlejning-valgt-ejendom'

function laesGemtEjendomId() {
  const gemt = Number(localStorage.getItem(LAGRET_NOEGLE))
  return gemt || null
}

// Delt (singleton) tilstand, samme mønster som useValgtAar.js, så alle moduler viser og opdaterer
// den samme valgte ejendom. Kan være null, hvis der endnu ikke er oprettet nogen ejendomme.
const valgtEjendomId = ref(laesGemtEjendomId())

watch(valgtEjendomId, (nyt) => {
  if (nyt == null) localStorage.removeItem(LAGRET_NOEGLE)
  else localStorage.setItem(LAGRET_NOEGLE, String(nyt))
})

export function useValgtEjendom() {
  return valgtEjendomId
}
