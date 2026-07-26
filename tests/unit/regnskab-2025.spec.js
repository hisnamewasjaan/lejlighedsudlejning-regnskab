import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { beregnAaretsOverskud, fordelHaevning } from '@/composables/useVsoBeregning'

// Facit-filen ligger i "udlejning 2025/" (gitignored, personfølsomme skattetal) og findes derfor
// ikke nødvendigvis i alle miljøer - falder i så fald tilbage til de opdigtede tal i
// tests/fixtures/ (se README.md der), så testen stadig kører i CI/på en frisk klone.
// Bemærk: mappenavnet indeholder et mellemrum, så vi bruger path.resolve fremfor URL-parsing.
const egenFacitPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../udlejning 2025/facit.json')
const facitPath = existsSync(egenFacitPath)
  ? egenFacitPath
  : resolve(dirname(fileURLToPath(import.meta.url)), '../fixtures/facit.json')

describe('Regnskab 2025 – validering mod revisorens tal', () => {
  const facit = JSON.parse(readFileSync(facitPath, 'utf-8'))

  it('årets overskud (rubrik 149) matcher revisorens opgørelse', () => {
    const indtaegter = facit.rubrik111_overskudFoerRenterOgKapitalafkast + facit.rubrik114_renteindtaegt
    const udgifter = facit.rubrik117_renteudgift

    const overskud = beregnAaretsOverskud({
      indtaegter,
      udgifter,
      kapitalafkast: facit.rubrik148_kapitalafkast,
    })

    expect(overskud).toBe(facit.rubrik149_indkomstTilVirksomhedsbeskatning)
  })

  it('hele det beskattede beløb til rådighed kan hæves i 2026 uden restskat', () => {
    const { fordeling, ikkeDaekket } = fordelHaevning(facit.beskattetTilRaadighed2026, {
      beskattetTilRaadighed: facit.beskattetTilRaadighed2026,
      kapitalafkast: 0,
      aaretsOverskud: 0,
      opsparetOverskud: facit.opsparetOverskudBruttoFremfoertTil2026,
      indskudskonto: facit.indskudskontoUltimo,
    })

    expect(fordeling.beskattetTilRaadighed).toBe(facit.beskattetTilRaadighed2026)
    expect(ikkeDaekket).toBe(0)
  })

  it('en hævning ud over det skattefrie beløb rammer opsparet overskud som næste trin', () => {
    const ekstraHaevning = 50_000

    const { fordeling } = fordelHaevning(facit.beskattetTilRaadighed2026 + ekstraHaevning, {
      beskattetTilRaadighed: facit.beskattetTilRaadighed2026,
      kapitalafkast: 0,
      aaretsOverskud: 0,
      opsparetOverskud: facit.opsparetOverskudBruttoFremfoertTil2026,
      indskudskonto: facit.indskudskontoUltimo,
    })

    expect(fordeling.opsparetOverskud).toBe(ekstraHaevning)
  })
})
