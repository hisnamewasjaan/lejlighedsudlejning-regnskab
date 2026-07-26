/**
 * Kapitalafkastgrundlag ud fra VSL § 8, stk. 1: aktiver i VSO minus fem fradragsposter, opgjort
 * ved indkomstårets begyndelse (primo), ikke ultimo:
 * 1. Gæld (fx realkreditgæld)
 * 2. Beløb afsat efter §§ 4 og 10, stk. 1 - "hensat til senere hævning", jf. VSL § 5. Samme beløb
 *    som "beskattetTilRaadighed" i fordelHaevning() (revisorens "allerede beskattet beløb til
 *    rådighed"), blot for PRIMO året i stedet for den løbende saldo.
 * 3. Skyldigt depositum til lejeren (ikke en del af lejeindtægten).
 * (Mellemregningskonto og tidligere års § 4b-beløb er ikke relevante for denne virksomhed og er
 * ikke modelleret.)
 * Fast ejendom medregnes til den kontante ANSKAFFELSESSUM, ikke den løbende offentlige
 * ejendomsvurdering – det er en fast, historisk værdi, ikke et tal der ændrer sig hvert år.
 * @param {{ fastEjendomAnskaffelsessum?: number, banksaldo?: number, realkreditgaeld?: number, skyldigtDepositum?: number, hensatTilSenereHaevning?: number }} aktiver
 */
export function beregnKapitalafkastgrundlag({
  fastEjendomAnskaffelsessum = 0,
  banksaldo = 0,
  realkreditgaeld = 0,
  skyldigtDepositum = 0,
  hensatTilSenereHaevning = 0,
}) {
  return fastEjendomAnskaffelsessum + banksaldo - realkreditgaeld - skyldigtDepositum - hensatTilSenereHaevning
}

/**
 * Årets overskud ud fra VSL § 10: indtægter minus udgifter, afskrivninger og kapitalafkast.
 * Bygningsafskrivning er 0 for denne lejlighed, jf. afskrivningsloven § 14, stk. 2, nr. 4 (se SKATTEREGLER.md).
 * `indtaegter`/`udgifter` skal her være de FULDE summer, inkl. evt. renteindtægter/renteudgifter i
 * virksomheden (TastSelv rubrik 114/117) – disse holdes typisk uden for driftsresultatet (rubrik 111)
 * i visningen, men indgår i selve skatteopgørelsen. Bekræftet ved sammenligning af rubrik 111/114/117/
 * 148/149 for årene 2020-2024 i vso-tal.md (kun lokal, gitignored fil).
 * @param {{ indtaegter: number, udgifter: number, afskrivninger?: number, kapitalafkast: number }} params
 */
export function beregnAaretsOverskud({ indtaegter, udgifter, afskrivninger = 0, kapitalafkast }) {
  return indtaegter - udgifter - afskrivninger - kapitalafkast
}

/**
 * Foreløbig virksomhedsskat (22%) af den del af overskuddet der opspares i VSO, jf. VSL § 10.
 * @param {number} opsparetBeloeb
 */
export function beregnVirksomhedsskat(opsparetBeloeb) {
  return Math.max(0, opsparetBeloeb) * 0.22
}

/**
 * Beregner kapitalafkast ud fra VSL § 7-8.
 * @param {number} kapitalafkastgrundlag Aktiver minus erhvervsmæssig gæld i VSO
 * @param {number} kapitalafkastsats Sats fastsat af SKAT for året, som decimaltal (fx 0.02 for 2%)
 */
export function beregnKapitalafkast(kapitalafkastgrundlag, kapitalafkastsats) {
  return kapitalafkastgrundlag * kapitalafkastsats
}

/**
 * Den del af årets overskud der rent faktisk opspares i VSO (og dermed er grundlag for den
 * foreløbige virksomhedsskat), afhængig af brugerens hæv/opspar-valg for året.
 * @param {string} opsparValg 'haev' eller 'opspar'
 * @param {number} aaretsOverskud
 */
export function beregnOpsparetIAar(opsparValg, aaretsOverskud) {
  return opsparValg === 'opspar' ? Math.max(0, aaretsOverskud) : 0
}

/**
 * Fordeler en hævning efter hæverækkefølgen i VSL § 5, med et ekstra trin foran de fire lovbestemte:
 * 0. Allerede beskattet beløb til rådighed (fx "hensat til senere hævning", jf. revisorens opgørelse
 *    efter årsafslutning – ingen yderligere skattemæssige konsekvenser ved hævning).
 * 1. Kapitalafkast, 2. Overskud fra årets drift, 3. Opsparet overskud, 4. Indskudskonto.
 * @param {number} haevning Det ønskede hævningsbeløb
 * @param {{ beskattetTilRaadighed?: number, kapitalafkast: number, aaretsOverskud: number, opsparetOverskud: number, indskudskonto: number }} saldi
 */
export function fordelHaevning(haevning, saldi) {
  const raekkefoelge = ['beskattetTilRaadighed', 'kapitalafkast', 'aaretsOverskud', 'opsparetOverskud', 'indskudskonto']
  const fordeling = {}
  let resterende = haevning

  for (const post of raekkefoelge) {
    const tilraadighed = saldi[post] ?? 0
    const beloeb = Math.min(resterende, tilraadighed)
    fordeling[post] = beloeb
    resterende -= beloeb
  }

  return { fordeling, ikkeDaekket: resterende }
}

/**
 * Forslag til næste års "hensat til senere hævning" (beskattetTilRaadighed primo næste år), jf.
 * §§ 4 og 10, stk. 1: den del af årets kapitalafkast og overskud der allerede er beskattet - fordi
 * den ikke er valgt opsparet i VSO - men endnu ikke fysisk hævet fra virksomhedens konto ved årets
 * udgang. Beløbet der resterer i "puljen" efter årets faktiske hævninger, svarende til det samme
 * princip som fordelHaevning() bruger til at fordele en hævning.
 *
 * Et estimat, ikke et facit - arver den samme unøjagtighed som kapitalafkast-/
 * overskudsberegningen, og fanger ikke evt. yderligere korrektioner fra revisoren.
 * @param {{ beskattetTilRaadighedPrimo: number, kapitalafkast: number, aaretsOverskud: number, opsparetIAar: number, aaretsHaevninger: number }} params
 */
export function beregnForslagTilHensatNaesteAar({
  beskattetTilRaadighedPrimo,
  kapitalafkast,
  aaretsOverskud,
  opsparetIAar,
  aaretsHaevninger,
}) {
  const beloebBeskattetSomPersonligIndkomst = Math.max(0, aaretsOverskud) - opsparetIAar
  const pulje = beskattetTilRaadighedPrimo + kapitalafkast + beloebBeskattetSomPersonligIndkomst
  return Math.max(0, pulje - aaretsHaevninger)
}
