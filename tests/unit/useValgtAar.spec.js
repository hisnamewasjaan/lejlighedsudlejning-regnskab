import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'

describe('useValgtAar', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('falder tilbage til indeværende år, når intet er gemt', async () => {
    const { useValgtAar } = await import('@/composables/useValgtAar')
    expect(useValgtAar().value).toBe(new Date().getFullYear())
  })

  it('deler samme værdi på tværs af flere kald (singleton)', async () => {
    const { useValgtAar } = await import('@/composables/useValgtAar')
    const a = useValgtAar()
    const b = useValgtAar()

    a.value = 2020

    expect(b.value).toBe(2020)
  })

  it('gemmer valgt år i localStorage, så det huskes ved genindlæsning', async () => {
    const { useValgtAar } = await import('@/composables/useValgtAar')
    useValgtAar().value = 2023
    await nextTick()

    vi.resetModules()
    const { useValgtAar: useValgtAarIgen } = await import('@/composables/useValgtAar')

    expect(useValgtAarIgen().value).toBe(2023)
  })
})
