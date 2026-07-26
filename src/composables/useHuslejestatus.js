const MAANEDSNAVNE = [
  'januar',
  'februar',
  'marts',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'december',
]

/**
 * Finder den lejer hvis lejemål er aktivt på en given dato.
 * Antager ét aktivt lejemål ad gangen (én lejlighed).
 * @param {Array} tenants
 * @param {Date} paaDato
 */
export function findAktivLejer(tenants, paaDato) {
  const iso = paaDato.toISOString().slice(0, 10)
  return tenants.find((t) => t.lejemaalStart <= iso && (!t.lejemaalSlut || t.lejemaalSlut >= iso)) ?? null
}

/**
 * Beregner huslejestatus (betalt/mangler) måned for måned for en aktiv lejer i et givet år.
 * @param {{ tenant: object, transactions: Array, aar: number, tilOgMedMaaned: number }} params
 */
export function beregnHuslejestatus({ tenant, transactions, aar, tilOgMedMaaned }) {
  if (!tenant) return []

  const lejemaalStartAar = Number(tenant.lejemaalStart.slice(0, 4))
  const lejemaalStartMaaned = lejemaalStartAar === aar ? Number(tenant.lejemaalStart.slice(5, 7)) : 1
  const lejemaalSlutMaaned =
    tenant.lejemaalSlut && Number(tenant.lejemaalSlut.slice(0, 4)) === aar
      ? Number(tenant.lejemaalSlut.slice(5, 7))
      : 12

  const startMaaned = lejemaalStartAar > aar ? null : lejemaalStartMaaned
  if (startMaaned === null) return []

  const slutMaaned = Math.min(tilOgMedMaaned, lejemaalSlutMaaned)
  const status = []

  for (let maaned = startMaaned; maaned <= slutMaaned; maaned++) {
    const maanedStr = String(maaned).padStart(2, '0')
    const prefix = `${aar}-${maanedStr}`
    const betaltBeloeb = transactions
      .filter((t) => t.type === 'indtaegt' && t.kategori === 'husleje' && t.dato?.startsWith(prefix))
      .reduce((sum, t) => sum + t.belob, 0)

    status.push({
      maaned,
      label: `${MAANEDSNAVNE[maaned - 1]} ${aar}`,
      forventet: tenant.maanedligHusleje ?? 0,
      betalt: betaltBeloeb,
      status: betaltBeloeb >= (tenant.maanedligHusleje ?? 0) ? 'betalt' : 'mangler',
    })
  }

  return status
}
