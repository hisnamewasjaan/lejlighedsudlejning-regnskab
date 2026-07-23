/**
 * Parser til danske netbank-CSV-eksporter (semikolon-separeret, dansk talformat med komma som
 * decimaltegn og punktum som tusindtalsseparator, datoer som DD.MM.YYYY).
 *
 * Bruges både til afstemning/validering (se tests/unit/afstemning-2025.spec.js) og som grundlag
 * for den fremtidige "upload CSV fra netbank"-funktion nævnt i PLAN.md.
 */

function parseDanskBeloeb(tekst) {
  return Number(tekst.trim().replace(/\./g, '').replace(',', '.'))
}

function parseDanskDato(tekst) {
  const [dag, maaned, aar] = tekst.trim().split('.')
  return `${aar}-${maaned}-${dag}`
}

/**
 * Afkoder en uploadet CSV-fils rå bytes til tekst. Danske netbank-eksporter er ofte
 * Windows-1252-kodede, ikke UTF-8 (æøå ville ellers blive forvansket). Forsøger UTF-8 først, og
 * falder tilbage til Windows-1252 hvis byte-sekvenserne ikke er gyldig UTF-8.
 * @param {ArrayBuffer} buffer
 */
export function decodeCsvBuffer(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('windows-1252').decode(buffer)
  }
}

/**
 * @param {string} csvTekst Rå CSV-tekst med header-linjen "Dato;Kategori;Underkategori;Tekst;Beløb;Saldo;Status;Afstemt;"
 *   Et evt. 9. felt (fri note, fx "privat brug") bruges af foreslaaKategori() til at genkende hævninger.
 * @returns {Array<{ dato: string, kategori: string, underkategori: string, tekst: string, beloeb: number, saldo: number, note: string }>}
 */
export function parseBankCsv(csvTekst) {
  const linjer = csvTekst.split(/\r?\n/).filter((linje) => linje.trim().length > 0)
  const [, ...dataLinjer] = linjer

  return dataLinjer
    .map((linje) => {
      const felter = linje.split(';')
      if (felter.length < 6 || !felter[0].trim()) return null

      return {
        dato: parseDanskDato(felter[0]),
        kategori: felter[1].trim(),
        underkategori: felter[2].trim(),
        tekst: felter[3].trim(),
        beloeb: parseDanskBeloeb(felter[4]),
        saldo: parseDanskBeloeb(felter[5]),
        note: (felter[8] ?? '').trim(),
      }
    })
    .filter(Boolean)
}

const KATEGORI_REGLER = [
  { match: /leje ?indt|husleje/i, type: 'indtaegt', kategori: 'husleje' },
  { match: /f[æa]llesudgift|ejerforening/i, type: 'udgift', kategori: 'ejerforening' },
  { match: /ejendomsskat|grundskyld/i, type: 'udgift', kategori: 'ejendomsskat' },
  { match: /forsikring/i, type: 'udgift', kategori: 'forsikring' },
  { match: /vedligehold/i, type: 'udgift', kategori: 'vedligeholdelse' },
  { match: /revisor|regnskab/i, type: 'udgift', kategori: 'revisor' },
  { match: /administration/i, type: 'udgift', kategori: 'administration' },
]

/**
 * Foreslår type/kategori for en bank-linje ud fra dens Kategori/Underkategori/Tekst-felter.
 * Et gæt, ikke en facitliste - vises redigerbart i importforhåndsvisningen (CsvImport.vue), så
 * brugeren altid kan rette det. Matcher på nøgleord, da forskellige banker navngiver deres egne
 * kategorier forskelligt.
 * @param {{ kategori: string, underkategori: string, tekst: string, beloeb: number, note?: string }} row
 * @returns {{ type: string, kategori: string, advarsel?: string }}
 */
export function foreslaaKategori(row) {
  if (/privat/i.test(row.note ?? '')) {
    return { type: 'haevning' }
  }

  const samletTekst = `${row.kategori} ${row.underkategori} ${row.tekst}`

  if (/depositum/i.test(samletTekst)) {
    return row.beloeb >= 0
      ? { type: 'indtaegt', kategori: 'depositum' }
      : { type: 'udgift', kategori: 'depositum_tilbagebetaling' }
  }

  if (/realkredit|kreditforening/i.test(samletTekst)) {
    return {
      type: 'udgift',
      kategori: 'anden_udgift',
      advarsel: 'Bankens beløb blander renter, bidrag og afdrag på hele lånet. Bogfør denne linje ikke - indtast i stedet årets samlede renter og bidrag som ét tal på VSO-siden, ud fra realkreditinstituttets årsopgørelse, jf. SKATTEREGLER.md punkt 9.',
    }
  }

  if (/\brente(r)?\b/i.test(samletTekst)) {
    return row.beloeb >= 0
      ? { type: 'indtaegt', kategori: 'renteindtaegt' }
      : { type: 'udgift', kategori: 'anden_udgift' }
  }

  for (const regel of KATEGORI_REGLER) {
    if (regel.match.test(samletTekst)) {
      return { type: regel.type, kategori: regel.kategori }
    }
  }

  const type = row.beloeb >= 0 ? 'indtaegt' : 'udgift'
  return { type, kategori: type === 'indtaegt' ? 'anden_indtaegt' : 'anden_udgift' }
}
