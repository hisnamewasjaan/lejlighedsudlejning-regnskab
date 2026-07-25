import { describe, expect, it } from 'vitest'
import { decodeCsvBuffer, foreslaaKategori, parseBankCsv } from '@/utils/bankCsv'

const eksempelCsv = `Dato;Kategori;Underkategori;Tekst;Beløb;Saldo;Status;Afstemt;
02.01.2025;Bolig;Fællesudgifter;E/F Test;-4.505,00;85.431,05;Udført;Nej;
31.01.2025;Øvrige indtægter;Lejeindtægt;Rent february 2025;16.500,00;101.931,05;Udført;Nej;
31.08.2025;Øvrige udgifter;Overførsler;Donor;-40.000,00;71.867,74;Udført;Nej;privat brug
`

describe('parseBankCsv', () => {
  it('parser dansk talformat og datoer korrekt', () => {
    const rows = parseBankCsv(eksempelCsv)

    expect(rows).toHaveLength(3)
    expect(rows[0]).toMatchObject({
      dato: '2025-01-02',
      kategori: 'Bolig',
      underkategori: 'Fællesudgifter',
      tekst: 'E/F Test',
      beloeb: -4505,
      saldo: 85431.05,
    })
    expect(rows[1]).toMatchObject({ dato: '2025-01-31', beloeb: 16500 })
  })

  it('læser en evt. fri note (9. felt), fx "privat brug"', () => {
    const rows = parseBankCsv(eksempelCsv)
    expect(rows[0].note).toBe('')
    expect(rows[2].note).toBe('privat brug')
  })

  it('springer tomme linjer over', () => {
    const rows = parseBankCsv(eksempelCsv + '\n\n')
    expect(rows).toHaveLength(3)
  })

  it('springer linjer over uden dato, selvom der er nok felter', () => {
    const csv = eksempelCsv + ';Bolig;Fællesudgifter;Tomt;-100,00;1000,00;Udført;Nej;\n'
    const rows = parseBankCsv(csv)
    expect(rows).toHaveLength(3)
  })

  it('sætter note til tom streng når 9. felt slet ikke findes i linjen', () => {
    const csvUdenNoteKolonne = `Dato;Kategori;Underkategori;Tekst;Beløb;Saldo;Status;Afstemt\n02.01.2025;Bolig;Fællesudgifter;E/F Test;-4.505,00;85.431,05;Udført;Nej`
    const rows = parseBankCsv(csvUdenNoteKolonne)
    expect(rows[0].note).toBe('')
  })
})

describe('foreslaaKategori', () => {
  it('genkender husleje ud fra underkategori', () => {
    const row = { kategori: 'Øvrige indtægter', underkategori: 'Lejeindtægt', tekst: 'Rent marts', beloeb: 16500 }
    expect(foreslaaKategori(row)).toEqual({ type: 'indtaegt', kategori: 'husleje' })
  })

  it('genkender ejerforeningsudgift', () => {
    const row = { kategori: 'Bolig', underkategori: 'Fællesudgifter', tekst: 'E/F Test', beloeb: -2290 }
    expect(foreslaaKategori(row)).toEqual({ type: 'udgift', kategori: 'ejerforening' })
  })

  it('skelner depositum-modtagelse fra -tilbagebetaling ud fra fortegn', () => {
    const modtaget = { kategori: '', underkategori: '', tekst: 'Depositum ny lejer', beloeb: 24000 }
    const tilbagebetalt = { kategori: '', underkategori: '', tekst: 'Depositum retur', beloeb: -3000 }

    expect(foreslaaKategori(modtaget)).toEqual({ type: 'indtaegt', kategori: 'depositum' })
    expect(foreslaaKategori(tilbagebetalt)).toEqual({ type: 'udgift', kategori: 'depositum_tilbagebetaling' })
  })

  it('advarer om at realkreditlinjer kan blande renter, bidrag og afdrag', () => {
    const row = { kategori: 'Bolig', underkategori: 'Realkreditlån', tekst: 'Realkredit Danmark', beloeb: -7828 }
    const forslag = foreslaaKategori(row)

    expect(forslag.type).toBe('udgift')
    expect(forslag.kategori).toBe('anden_udgift')
    expect(forslag.advarsel).toBeTruthy()
  })

  it('genkender bankrente som renteindtægt (rubrik 114), adskilt fra realkreditrenter', () => {
    const row = { kategori: 'Renter', underkategori: '', tekst: 'Rente', beloeb: 12.5 }
    expect(foreslaaKategori(row)).toEqual({ type: 'indtaegt', kategori: 'renteindtaegt' })
  })

  it('genkender negativ rente (fx morarenter man selv betaler) som en udgift, ikke en indtægt', () => {
    const row = { kategori: 'Renter', underkategori: '', tekst: 'Rente', beloeb: -12.5 }
    expect(foreslaaKategori(row)).toEqual({ type: 'udgift', kategori: 'anden_udgift' })
  })

  it('genkender en hævning ud fra "privat" i noten, uanset kategori', () => {
    const row = { kategori: 'Øvrige udgifter', underkategori: 'Overførsler', tekst: 'Donor', beloeb: -40000, note: 'privat brug' }
    expect(foreslaaKategori(row)).toEqual({ type: 'haevning' })
  })

  it('falder tilbage til fortegns-baseret gæt når intet nøgleord matcher', () => {
    const row = { kategori: 'Ukendt', underkategori: 'Ukendt', tekst: 'Et eller andet', beloeb: -500 }
    expect(foreslaaKategori(row)).toEqual({ type: 'udgift', kategori: 'anden_udgift' })
  })

  it('falder tilbage til anden_indtaegt for et positivt, umatchet beløb', () => {
    const row = { kategori: 'Ukendt', underkategori: 'Ukendt', tekst: 'Et eller andet', beloeb: 500 }
    expect(foreslaaKategori(row)).toEqual({ type: 'indtaegt', kategori: 'anden_indtaegt' })
  })
})

describe('decodeCsvBuffer', () => {
  it('afkoder gyldig UTF-8 direkte', () => {
    const buffer = new TextEncoder().encode('Test æøå').buffer
    expect(decodeCsvBuffer(buffer)).toBe('Test æøå')
  })

  it('falder tilbage til Windows-1252 hvis bytes ikke er gyldig UTF-8', () => {
    // "Test æøå" som Windows-1252/Latin-1-bytes: æ=0xE6, ø=0xF8, å=0xE5
    const bytes = new Uint8Array([0x54, 0x65, 0x73, 0x74, 0x20, 0xe6, 0xf8, 0xe5])
    expect(decodeCsvBuffer(bytes.buffer)).toBe('Test æøå')
  })
})
