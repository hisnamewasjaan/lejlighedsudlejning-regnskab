import { ref } from 'vue'
import { db } from '@/db'
import { useValgtEjendom } from '@/composables/useValgtEjendom'

export const HYPPIGHED_LABELS = {
  maanedlig: 'Månedlig',
  kvartalsvis: 'Kvartalsvis',
  aarlig: 'Årlig',
}

// Datoer er "YYYY-MM-DD"-strenge uden klokkeslæt. new Date(...) parser dem som UTC-midnat, så al
// videre regning skal bruge UTC-varianterne af get/set – ellers forskydes datoen af den lokale
// tidszone (fx UTC-8 gør "2026-01-01" til "2025-12-31" lokalt, hvilket giver en forkert forfaldsdato).
function naesteDato(dato, hyppighed) {
  const d = new Date(`${dato}T00:00:00Z`)
  if (hyppighed === 'maanedlig') {
    d.setUTCMonth(d.getUTCMonth() + 1)
  }
  if (hyppighed === 'kvartalsvis') {
    d.setUTCMonth(d.getUTCMonth() + 3)
  }
  if (hyppighed === 'aarlig') {
    d.setUTCFullYear(d.getUTCFullYear() + 1)
  }
  return d.toISOString().slice(0, 10)
}

/**
 * Genererer forfaldsdatoerne en fast postering skal dække, fra startDato til og med tilDato,
 * afgrænset af en evt. slutDato på skabelonen (fx en lejers fraflytningsdato).
 */
export function genererPerioder(template, tilDato) {
  const perioder = []
  const slut = template.slutDato && template.slutDato < tilDato ? template.slutDato : tilDato
  let dato = template.startDato

  while (dato <= slut) {
    perioder.push(dato)
    dato = naesteDato(dato, template.hyppighed)
  }

  return perioder
}

/**
 * En periode anses for dækket hvis der findes en bogført postering af samme type/kategori,
 * hvis dato ligger i intervallet [periodeStart, næste forfaldsdato[.
 */
export function beregnManglendePerioder({ template, transactions, tilDato }) {
  return genererPerioder(template, tilDato).filter((periodeStart) => {
    const periodeSlut = naesteDato(periodeStart, template.hyppighed)
    return !transactions.some(
      (t) =>
        t.type === template.type && t.kategori === template.kategori && t.dato >= periodeStart && t.dato < periodeSlut,
    )
  })
}

const valgtEjendomId = useValgtEjendom()

export function useRecurringTransactions() {
  const templates = ref([])
  const loading = ref(true)

  async function load() {
    loading.value = true
    templates.value = await db.recurringTransactions.toArray()
    loading.value = false
  }

  async function addTemplate(data) {
    await db.recurringTransactions.add({ ejendomId: valgtEjendomId.value, ...data })
    await load()
  }

  async function deleteTemplate(id) {
    await db.recurringTransactions.delete(id)
    await load()
  }

  load()

  return { templates, loading, addTemplate, deleteTemplate }
}
