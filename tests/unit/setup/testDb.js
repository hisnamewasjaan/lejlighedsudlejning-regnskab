import { vi } from 'vitest'

/**
 * Giver hver test en tom database og genindlæser `@/db` og modulet-under-test, så
 * modul-singleton-state (fx `useEjendomme`s liste-ref, der indlæses ved import) ikke lækker mellem
 * tests. Den underliggende fake-indexeddb-instans er global og deles for hele testkørslen - dét er
 * fint, da vi rydder alle tabeller her, fremfor at udskifte selve indexedDB-implementeringen (som
 * Dexie kun læser reference til, én gang, ved modulets første load).
 *
 * Kaldes i en `beforeEach`, før man dynamisk importerer det modul, testen omhandler:
 *
 *   beforeEach(async () => {
 *     ({ db } = await nulstilDatabase())
 *   })
 */
export async function nulstilDatabase() {
  localStorage.clear()
  vi.resetModules()
  const { db } = await import('@/db')
  await Promise.all(db.tables.map((table) => table.clear()))
  return { db }
}

/**
 * IndexedDB-operationer (også via fake-indexeddb) afvikles over den rigtige event loop, ikke Vues
 * mikrotask-kø - `await nextTick()` er derfor ikke nok til at vente på et composable-load. Poller
 * i stedet indtil betingelsen er sand.
 */
export async function ventPaa(betingelse, { timeout = 1000, interval = 5 } = {}) {
  const start = Date.now()
  while (!betingelse()) {
    if (Date.now() - start > timeout) {
      throw new Error('ventPaa: timeout - betingelsen blev aldrig sand')
    }
    await new Promise((resolve) => setTimeout(resolve, interval))
  }
}
