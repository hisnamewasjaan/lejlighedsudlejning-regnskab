import { ref, watch } from 'vue'

const LAGRET_NOEGLE = 'lejlighedsudlejning-valgt-aar'

function laesGemtAar() {
  const gemt = Number(localStorage.getItem(LAGRET_NOEGLE))
  return gemt || new Date().getFullYear()
}

// Delt (singleton) tilstand: samme mønster som useTransactions.js, så alle moduler (VSO,
// Rapporter, Dashboard) viser og opdaterer det samme valgte år, i stedet for hver sit.
const valgtAar = ref(laesGemtAar())

watch(valgtAar, (nyt) => {
  localStorage.setItem(LAGRET_NOEGLE, String(nyt))
})

export function useValgtAar() {
  return valgtAar
}
