import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { decodeCsvBuffer, parseBankCsv } from '@/utils/bankCsv'
import { beregnAaretsOverskud } from '@/composables/useVsoBeregning'

// "udlejning 2025/" er gitignored (personfølsomme banktransaktioner). Testene springes over,
// hvis mappen/filerne mangler i det aktuelle miljø.
const mappe = resolve(dirname(fileURLToPath(import.meta.url)), '../../udlejning 2025')
const csvPath = resolve(mappe, 'posteringer.csv')
const facitPath = resolve(mappe, 'facit.json')
const harData = existsSync(csvPath) && existsSync(facitPath)

// Kategoriserer en banklinje til appens type/kategori-model.
//
// To poster udelades bevidst her og bruges i stedet fra facit.json (bekræftet af TastSelv
// "Skatteoplysninger"-udtrækket), da banklinjerne ikke er fyldestgørende for dem:
// - "Realkreditlån": banklinjerne blander renter, bidrag og afdrag på ét af tre lån. Kun ét lån
//   er overført til virksomhedsindkomsten (rubrik 117) - de to andre lån hører til den private
//   bolig og er korrekt holdt udenfor VSO. Afdraget på VSO-lånet nedbringer kun gælden og skal
//   ikke i resultatopgørelsen.
// - "Ejendomsskat": banklinjen viser kun et mindre beløb, men den faktiske grundskyld for 2025 var
//   højere (grundskylden betales tilsyneladende ikke fuldt ud fra denne konto).
function kategoriser(row) {
  const tekst = row.tekst.toLowerCase()

  if (row.underkategori === 'Lejeindtægt') return { type: 'indtaegt', kategori: 'husleje' }
  if (row.underkategori === 'Fællesudgifter') return { type: 'udgift', kategori: 'ejerforening' }
  if (row.underkategori === 'Ejendomsskat') return null
  if (row.underkategori === 'Realkreditlån') return null
  if (tekst.startsWith('revisor')) return { type: 'udgift', kategori: 'revisor' }
  if (tekst.startsWith('deposit')) return { type: 'udgift', kategori: 'depositum_tilbagebetaling' }
  if (tekst.includes('consumpt')) return { type: 'udgift', kategori: 'anden_udgift' }
  if (tekst === 'rente') return { type: 'indtaegt', kategori: 'renteindtaegt' }
  if (tekst.startsWith('donor')) return { type: 'haevning' }

  return { type: 'ukendt', kategori: row.underkategori }
}

describe.skipIf(!harData)('Afstemning 2025 – rigtige banktransaktioner', () => {
  const facit = harData ? JSON.parse(readFileSync(facitPath, 'utf-8')) : null
  const rows = harData ? parseBankCsv(decodeCsvBuffer(readFileSync(csvPath))) : []
  const posteringer = rows.map((row) => ({ ...row, ...kategoriser(row) })).filter((p) => p.type !== null)

  it('alle rækker genkendes (ingen postering havner som "ukendt")', () => {
    const ukendte = posteringer.filter((p) => p.type === 'ukendt')
    expect(ukendte).toEqual([])
  })

  it('husleje-indtægten stemmer med 12 måneders leje á 16.500 kr', () => {
    const husleje = posteringer.filter((p) => p.kategori === 'husleje').reduce((sum, p) => sum + p.beloeb, 0)
    expect(husleje).toBe(12 * 16_500)
  })

  it('bankens renteindtægt matcher facit rubrik 114 (afrundet)', () => {
    const renteindtaegt = posteringer
      .filter((p) => p.kategori === 'renteindtaegt')
      .reduce((sum, p) => sum + p.beloeb, 0)

    expect(Math.round(renteindtaegt)).toBe(facit.rubrik114_renteindtaegt)
  })

  it('private hævninger holdes uden for resultatopgørelsen', () => {
    const haevninger = posteringer.filter((p) => p.type === 'haevning')
    expect(haevninger).toHaveLength(1)
    expect(Math.abs(haevninger[0].beloeb)).toBe(40_000)
  })

  it('beregner årets overskud ud fra bogførte posteringer + bekræftede facit-tal, og rapporterer afvigelsen fra revisorens tal', () => {
    const indtaegter = posteringer.filter((p) => p.type === 'indtaegt').reduce((sum, p) => sum + p.beloeb, 0)
    // + den fradragsberettigede renteudgift på VSO-lånet og den faktiske grundskyld – begge
    // bekræftet af TastSelv "Skatteoplysninger" og ikke fuldt ud udledelige af banklinjerne alene.
    const udgifter =
      posteringer.filter((p) => p.type === 'udgift').reduce((sum, p) => sum + Math.abs(p.beloeb), 0) +
      facit.rubrik117_renteudgift +
      facit.ejendom.grundskyld2025

    const overskud = beregnAaretsOverskud({ indtaegter, udgifter, kapitalafkast: facit.rubrik148_kapitalafkast })
    const afvigelse = overskud - facit.rubrik149_indkomstTilVirksomhedsbeskatning

    // Lille, dokumenteret restafvigelse (se README.md i "udlejning 2025/") - formentlig
    // periodisering/afrunding. Testen holder øje med at den ikke vokser uventet.
    // eslint-disable-next-line no-console
    console.log(
      `Afstemning 2025: appens beregnede overskud ${overskud} kr. vs. revisorens ${facit.rubrik149_indkomstTilVirksomhedsbeskatning} kr. (afvigelse: ${afvigelse} kr.)`,
    )
    expect(Math.abs(afvigelse)).toBeLessThan(5_000)
  })
})
