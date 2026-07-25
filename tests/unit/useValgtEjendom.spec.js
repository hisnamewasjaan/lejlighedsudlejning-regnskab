import { beforeEach, describe, expect, it, vi } from 'vitest'

describe('useValgtEjendom', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('falder tilbage til null, når intet er gemt', async () => {
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    expect(useValgtEjendom().value).toBeNull()
  })

  it('læser et tidligere gemt ejendomId ved indlæsning', async () => {
    localStorage.setItem('lejlighedsudlejning-valgt-ejendom', '5')

    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    expect(useValgtEjendom().value).toBe(5)
  })

  it('gemmer et nyt valgt ejendomId i localStorage', async () => {
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    useValgtEjendom().value = 9

    await vi.waitFor(() => {
      expect(localStorage.getItem('lejlighedsudlejning-valgt-ejendom')).toBe('9')
    })
  })

  it('fjerner nøglen fra localStorage når valget nulstilles til null', async () => {
    localStorage.setItem('lejlighedsudlejning-valgt-ejendom', '5')
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')

    useValgtEjendom().value = null

    await vi.waitFor(() => {
      expect(localStorage.getItem('lejlighedsudlejning-valgt-ejendom')).toBeNull()
    })
  })

  it('deler samme værdi på tværs af flere kald (singleton)', async () => {
    const { useValgtEjendom } = await import('@/composables/useValgtEjendom')
    const a = useValgtEjendom()
    const b = useValgtEjendom()

    a.value = 3

    expect(b.value).toBe(3)
  })
})
