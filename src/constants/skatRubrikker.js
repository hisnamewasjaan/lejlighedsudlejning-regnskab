/**
 * Kendte SKAT-rubriknumre for virksomhedsordningen, bekræftet ud fra egne TastSelv-udtræk
 * (se SKATTEREGLER.md og "udlejning 2025/"). Bruges til at vise brugeren hvor et tal kan
 * genfindes/afstemmes i TastSelv Erhverv – ikke alle tal i appen har et fast rubriknummer.
 */
export const RUBRIK = {
  overskudVirksomhed: '111',
  renteindtaegtVirksomhed: '114',
  renteudgiftVirksomhed: '117',
  kapitalafkast: '148',
  indkomstTilVirksomhedsbeskatning: '149',
  rentekorrektion: '150',
  samledeOverfoersler: '152',
  indskudskontoUltimo: '984',
  // Personlige rubrikker (overføres til virksomhedsrubrikkerne ovenfor)
  renteindtaegtPersonlig: '31',
  renteudgiftRealkredit: '41',
}
