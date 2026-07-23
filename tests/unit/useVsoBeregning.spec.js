import { describe, expect, it } from 'vitest'
import {
  beregnAaretsOverskud,
  beregnForslagTilHensatNaesteAar,
  beregnKapitalafkast,
  beregnKapitalafkastgrundlag,
  beregnVirksomhedsskat,
  fordelHaevning,
} from '@/composables/useVsoBeregning'

describe('beregnKapitalafkast', () => {
  it('beregner kapitalafkast som grundlag gange sats', () => {
    expect(beregnKapitalafkast(2_000_000, 0.02)).toBe(40_000)
  })
})

describe('beregnKapitalafkastgrundlag', () => {
  it('lægger anskaffelsessum og banksaldo sammen og trækker realkreditgæld fra', () => {
    expect(
      beregnKapitalafkastgrundlag({ fastEjendomAnskaffelsessum: 3_000_000, banksaldo: 50_000, realkreditgaeld: 1_500_000 }),
    ).toBe(1_550_000)
  })

  it('håndterer manglende felter som 0', () => {
    expect(beregnKapitalafkastgrundlag({ fastEjendomAnskaffelsessum: 1_000_000 })).toBe(1_000_000)
  })

  it('trækker skyldigt depositum fra, da det er en gæld til lejeren', () => {
    expect(
      beregnKapitalafkastgrundlag({
        fastEjendomAnskaffelsessum: 1_855_000,
        realkreditgaeld: 761_126,
        skyldigtDepositum: 24_000,
      }),
    ).toBe(1_855_000 - 761_126 - 24_000)
  })

  it('trækker beløb hensat til senere hævning fra (VSL § 8, stk. 1, jf. §§ 4 og 10 stk. 1)', () => {
    expect(
      beregnKapitalafkastgrundlag({
        fastEjendomAnskaffelsessum: 1_855_000,
        realkreditgaeld: 850_000,
        skyldigtDepositum: 47_850,
        hensatTilSenereHaevning: 112_981,
      }),
    ).toBe(1_855_000 - 850_000 - 47_850 - 112_981)
  })
})

describe('beregnAaretsOverskud', () => {
  it('trækker udgifter, afskrivninger og kapitalafkast fra indtægter', () => {
    expect(
      beregnAaretsOverskud({ indtaegter: 100_000, udgifter: 30_000, afskrivninger: 5_000, kapitalafkast: 10_000 }),
    ).toBe(55_000)
  })

  it('afskrivninger er 0 som standard (bygningsafskrivning ikke tilladt ved beboelsesudlejning)', () => {
    expect(beregnAaretsOverskud({ indtaegter: 100_000, udgifter: 30_000, kapitalafkast: 10_000 })).toBe(60_000)
  })

  it('matcher rubrik 149 = rubrik 111 + rubrik 114 − rubrik 117 − rubrik 148 (jf. vso-tal.md)', () => {
    // Eksempeltal der illustrerer rubrik-formlen: driftsresultat (111) + renteindtægt (114) −
    // renteudgift (117) − kapitalafkast (148) = indkomst til virksomhedsbeskatning (149).
    expect(
      beregnAaretsOverskud({
        indtaegter: 150_000 + 100,
        udgifter: 6_000,
        kapitalafkast: 19_000,
      }),
    ).toBe(125_100)
  })
})

describe('beregnVirksomhedsskat', () => {
  it('beregner 22% af det opsparede beløb', () => {
    expect(beregnVirksomhedsskat(50_000)).toBe(11_000)
  })

  it('returnerer 0 ved negativt eller intet opsparet beløb', () => {
    expect(beregnVirksomhedsskat(-10_000)).toBe(0)
  })
})

describe('fordelHaevning', () => {
  it('bruger allerede beskattet beløb til rådighed først, før kapitalafkast', () => {
    const saldi = {
      beskattetTilRaadighed: 113_559,
      kapitalafkast: 10_000,
      aaretsOverskud: 0,
      opsparetOverskud: 0,
      indskudskonto: 0,
    }

    const { fordeling, ikkeDaekket } = fordelHaevning(120_000, saldi)

    expect(fordeling.beskattetTilRaadighed).toBe(113_559)
    expect(fordeling.kapitalafkast).toBe(6_441)
    expect(ikkeDaekket).toBe(0)
  })

  it('følger hæverækkefølgen: kapitalafkast, årets overskud, opsparet overskud, indskudskonto', () => {
    const saldi = {
      kapitalafkast: 10_000,
      aaretsOverskud: 20_000,
      opsparetOverskud: 50_000,
      indskudskonto: 100_000,
    }

    const { fordeling, ikkeDaekket } = fordelHaevning(35_000, saldi)

    expect(fordeling.kapitalafkast).toBe(10_000)
    expect(fordeling.aaretsOverskud).toBe(20_000)
    expect(fordeling.opsparetOverskud).toBe(5_000)
    expect(fordeling.indskudskonto).toBe(0)
    expect(ikkeDaekket).toBe(0)
  })

  it('rapporterer ikke-dækket beløb hvis hævning overstiger alle saldi', () => {
    const saldi = { kapitalafkast: 0, aaretsOverskud: 0, opsparetOverskud: 0, indskudskonto: 10_000 }

    const { ikkeDaekket } = fordelHaevning(15_000, saldi)

    expect(ikkeDaekket).toBe(5_000)
  })
})

describe('beregnForslagTilHensatNaesteAar', () => {
  it('lægger primo-beløb, kapitalafkast og hævet overskud sammen, minus faktiske hævninger', () => {
    expect(
      beregnForslagTilHensatNaesteAar({
        beskattetTilRaadighedPrimo: 99_000,
        kapitalafkast: 18_899,
        aaretsOverskud: 122_409,
        opsparetIAar: 0,
        aaretsHaevninger: 150_000,
      }),
    ).toBe(99_000 + 18_899 + 122_409 - 150_000)
  })

  it('medregner ikke årets overskud, hvis det er valgt opsparet i VSO', () => {
    expect(
      beregnForslagTilHensatNaesteAar({
        beskattetTilRaadighedPrimo: 0,
        kapitalafkast: 10_000,
        aaretsOverskud: 100_000,
        opsparetIAar: 100_000,
        aaretsHaevninger: 0,
      }),
    ).toBe(10_000)
  })

  it('går aldrig under 0, selvom hævninger overstiger den beskattede pulje', () => {
    expect(
      beregnForslagTilHensatNaesteAar({
        beskattetTilRaadighedPrimo: 10_000,
        kapitalafkast: 5_000,
        aaretsOverskud: 20_000,
        opsparetIAar: 0,
        aaretsHaevninger: 100_000,
      }),
    ).toBe(0)
  })

  it('trækker ikke et underskud (negativt årets overskud) fra puljen', () => {
    expect(
      beregnForslagTilHensatNaesteAar({
        beskattetTilRaadighedPrimo: 50_000,
        kapitalafkast: 5_000,
        aaretsOverskud: -20_000,
        opsparetIAar: 0,
        aaretsHaevninger: 0,
      }),
    ).toBe(55_000)
  })
})
