// jsdom skipper sin egen localStorage-polyfill, hvis den ser at globalThis allerede har en
// "localStorage"-property - hvilket Node 22+ gør (en indbygget, eksperimentel implementering, der
// kræver --localstorage-file og ellers er undefined). Uden dette shim fejler alle tests, der bruger
// localStorage, på nyere Node-versioner, selvom CI (Node 20) er upåvirket. Erstattes ubetinget med
// en simpel in-memory-udgave, så testene er stabile uanset lokal Node-version.
class MemoryStorage {
  #store = new Map()

  getItem(key) {
    return this.#store.has(key) ? this.#store.get(key) : null
  }

  setItem(key, value) {
    this.#store.set(key, String(value))
  }

  removeItem(key) {
    this.#store.delete(key)
  }

  clear() {
    this.#store.clear()
  }

  key(index) {
    return [...this.#store.keys()][index] ?? null
  }

  get length() {
    return this.#store.size
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true,
})
