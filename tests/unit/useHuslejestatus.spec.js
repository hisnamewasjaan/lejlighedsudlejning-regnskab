import { describe, expect, it } from 'vitest'
import { beregnHuslejestatus, findAktivLejer } from '@/composables/useHuslejestatus'

const tenant = {
  id: 1,
  navn: 'Jane Doe',
  lejemaalStart: '2026-01-01',
  lejemaalSlut: '',
  maanedligHusleje: 8000,
}

describe('findAktivLejer', () => {
  it('finder lejeren hvis lejemålet er igangværende', () => {
    expect(findAktivLejer([tenant], new Date('2026-06-15'))).toEqual(tenant)
  })

  it('returnerer null hvis ingen lejemål er aktive på datoen', () => {
    const udloebet = { ...tenant, lejemaalSlut: '2025-12-31' }
    expect(findAktivLejer([udloebet], new Date('2026-06-15'))).toBeNull()
  })
})

describe('beregnHuslejestatus', () => {
  it('markerer måneder som betalt når husleje-postering dækker beløbet', () => {
    const transactions = [
      { type: 'indtaegt', kategori: 'husleje', dato: '2026-01-03', belob: 8000 },
      { type: 'indtaegt', kategori: 'husleje', dato: '2026-02-01', belob: 8000 },
    ]

    const status = beregnHuslejestatus({ tenant, transactions, aar: 2026, tilOgMedMaaned: 3 })

    expect(status).toHaveLength(3)
    expect(status[0]).toMatchObject({ maaned: 1, status: 'betalt' })
    expect(status[1]).toMatchObject({ maaned: 2, status: 'betalt' })
    expect(status[2]).toMatchObject({ maaned: 3, status: 'mangler' })
  })

  it('tæller kun husleje-posteringer, ikke andre indtægter', () => {
    const transactions = [{ type: 'indtaegt', kategori: 'anden_indtaegt', dato: '2026-01-10', belob: 8000 }]

    const status = beregnHuslejestatus({ tenant, transactions, aar: 2026, tilOgMedMaaned: 1 })

    expect(status[0].status).toBe('mangler')
  })

  it('returnerer tom liste hvis lejemålet ikke er startet i det pågældende år', () => {
    const fremtidigLejer = { ...tenant, lejemaalStart: '2027-01-01' }
    expect(beregnHuslejestatus({ tenant: fremtidigLejer, transactions: [], aar: 2026, tilOgMedMaaned: 12 })).toEqual([])
  })

  it('returnerer tom liste hvis der ikke er nogen lejer', () => {
    expect(beregnHuslejestatus({ tenant: null, transactions: [], aar: 2026, tilOgMedMaaned: 12 })).toEqual([])
  })

  it('stopper ved fraflytningsmåneden hvis lejemålet slutter midt i regnskabsåret', () => {
    const fraflyttet = { ...tenant, lejemaalSlut: '2026-03-15' }
    const status = beregnHuslejestatus({ tenant: fraflyttet, transactions: [], aar: 2026, tilOgMedMaaned: 12 })

    expect(status.map((s) => s.maaned)).toEqual([1, 2, 3])
  })

  it('bruger 0 som forventet husleje hvis lejeren ikke har en fast månedlig husleje sat', () => {
    const { maanedligHusleje, ...uden } = tenant
    const status = beregnHuslejestatus({ tenant: uden, transactions: [], aar: 2026, tilOgMedMaaned: 1 })

    expect(status[0]).toMatchObject({ forventet: 0, status: 'betalt' })
  })
})
