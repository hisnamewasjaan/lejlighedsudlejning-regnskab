import { ref } from 'vue'
import { db } from '@/db'
import { useValgtEjendom } from '@/composables/useValgtEjendom'

export const INDTAEGT_KATEGORIER = [
  { value: 'husleje', label: 'Husleje' },
  { value: 'depositum', label: 'Depositum' },
  { value: 'renteindtaegt', label: 'Renteindtægt' },
  { value: 'anden_indtaegt', label: 'Anden indtægt' },
]

export const UDGIFT_KATEGORIER = [
  { value: 'ejerforening', label: 'Ejerforeningsbidrag' },
  { value: 'ejendomsskat', label: 'Ejendomsskat / grundskyld' },
  { value: 'forsikring', label: 'Forsikring' },
  { value: 'vedligeholdelse', label: 'Vedligeholdelse' },
  { value: 'administration', label: 'Administrationsomkostninger' },
  { value: 'revisor', label: 'Regnskabs- og revisoromkostninger' },
  { value: 'depositum_tilbagebetaling', label: 'Depositum (tilbagebetaling)' },
  { value: 'anden_udgift', label: 'Anden udgift' },
]

// Delt (singleton) tilstand: flere komponenter kan være monteret samtidig og kalde
// useTransactions() uafhængigt (fx BogforingView + CsvImport). Med lokal state pr. kald ville en
// postering oprettet i den ene ikke opdatere listen i den anden - modulscope-refs deles af alle.
const transactions = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  transactions.value = await db.transactions.orderBy('dato').reverse().toArray()
  loading.value = false
}

load()

const valgtEjendomId = useValgtEjendom()

export function useTransactions() {
  async function addTransaction(data) {
    await db.transactions.add({ ejendomId: valgtEjendomId.value, ...data })
    await load()
  }

  async function deleteTransaction(id) {
    await db.transactions.delete(id)
    await load()
  }

  return { transactions, loading, addTransaction, deleteTransaction }
}
