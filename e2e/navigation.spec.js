import { expect, test } from '@playwright/test'

// Hver test starter med en frisk browser-kontekst (tom IndexedDB), og appen kræver nu en valgt
// ejendom før Bogføring/VSO/Rapporter/Selvangivelse/Dashboard viser noget - så alle tests opretter
// først én, fælles for hele filen.
test.beforeEach(async ({ page }) => {
  await page.goto('/stamdata')
  await page.getByRole('button', { name: '+ Opret ny ejendom' }).click()
  await page.getByLabel('Adresse på ny ejendom').fill('Testvej 1, 2100 København Ø')
  await page.getByRole('button', { name: 'Opret ejendom' }).click()
  await expect(page.getByRole('heading', { name: 'Lejlighedsoplysninger' })).toBeVisible()
})

test('kan navigere mellem hovedsiderne', async ({ page }) => {
  const nav = page.getByRole('navigation')

  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  await nav.getByRole('link', { name: 'Stamdata' }).click()
  await expect(page.getByRole('heading', { name: 'Stamdata' })).toBeVisible()

  await nav.getByRole('link', { name: 'Bogføring' }).click()
  await expect(page.getByRole('heading', { name: 'Bogføring' })).toBeVisible()

  await nav.getByRole('link', { name: 'VSO' }).click()
  await expect(page.getByRole('heading', { name: 'Virksomhedsordningen' })).toBeVisible()

  await nav.getByRole('link', { name: 'Rapporter' }).click()
  await expect(page.getByRole('heading', { name: 'Rapporter' })).toBeVisible()

  await nav.getByRole('link', { name: 'Selvangivelse' }).click()
  await expect(page.getByRole('heading', { name: 'Hjælp til selvangivelse' })).toBeVisible()
})

test('selvangivelse-siden viser rubrikkerne og følger det valgte år', async ({ page }) => {
  const thisYear = new Date().getFullYear()

  await page.goto('/vso')
  await page.getByLabel('År', { exact: true }).fill(String(thisYear))
  await page.getByLabel('Realkreditgæld primo året (kr.)').fill('500000')
  await page.getByRole('button', { name: 'Gem VSO-stamdata' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.goto('/selvangivelse')
  await expect(page.getByLabel('År', { exact: true })).toHaveValue(String(thisYear))
  await expect(page.getByRole('cell', { name: 'Overskud virksomhed/udlejningsejendom' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Kapitalafkast i virksomhedsordningen' })).toBeVisible()
  await expect(page.getByRole('row', { name: /Realkreditgæld primo året/ })).toContainText('-500.000 kr.')
  await expect(page.getByRole('cell', { name: 'Renteudgift, private realkreditlån (uden for VSO)' })).toBeVisible()
})

test('det valgte år følges ad på tværs af Dashboard, VSO og Rapporter', async ({ page }) => {
  const nav = page.getByRole('navigation')
  const aarFelt = () => page.getByLabel('År', { exact: true })

  await page.goto('/vso')
  await aarFelt().fill('2019')
  await expect(page.getByRole('heading', { name: 'VSO-stamdata for 2019' })).toBeVisible()

  await nav.getByRole('link', { name: 'Rapporter' }).click()
  await expect(aarFelt()).toHaveValue('2019')
  await expect(page.getByRole('heading', { name: 'Årsrapport 2019' })).toBeVisible()

  await nav.getByRole('link', { name: 'Dashboard' }).click()
  await expect(aarFelt()).toHaveValue('2019')
  await expect(page.getByRole('heading', { name: 'Dashboard – 2019' })).toBeVisible()

  // Ændres det på Dashboard, følger de andre sider med igen
  await aarFelt().fill('2018')
  await nav.getByRole('link', { name: 'VSO' }).click()
  await expect(aarFelt()).toHaveValue('2018')

  // Og huskes efter en fuld genindlæsning (localStorage)
  await page.reload()
  await expect(aarFelt()).toHaveValue('2018')
})

test('kan udfylde lejlighedsoplysninger og tilføje en lejer', async ({ page }) => {
  await page.goto('/stamdata')

  await page.getByLabel('Adresse').fill('Testvej 1, 2100 København Ø')
  await page.getByLabel('BFE-nummer').fill('123456789')
  await page.getByLabel('Ejendomsværdi (kr.)').fill('3000000')
  await page.getByLabel('Anskaffelsespris (kr.)').fill('2800000')
  await page.getByRole('button', { name: 'Gem lejlighedsoplysninger' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.reload()
  await expect(page.getByLabel('Adresse')).toHaveValue('Testvej 1, 2100 København Ø')

  await page.getByLabel('Navn').fill('Jane Doe')
  await page.getByLabel('Kontakt').fill('jane@example.com')
  await page.getByLabel('Lejemål start').fill('2026-01-01')
  await page.getByLabel('Månedlig husleje (kr.)').fill('8000')
  await page.getByLabel('Depositum (kr.)').fill('24000')
  await page.getByRole('button', { name: 'Tilføj lejer' }).click()

  await expect(page.getByText('Jane Doe')).toBeVisible()
})

test('kan registrere en indtægt og se den i posteringslisten', async ({ page }) => {
  await page.goto('/bogforing')

  await page.getByLabel('Dato').fill('2026-01-05')
  await page.getByLabel('Beløb (kr.)').fill('8000')
  await page.getByRole('button', { name: 'Registrér' }).click()

  await expect(page.getByText('Gemt')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Husleje' })).toBeVisible()
  await expect(page.getByText('8.000 kr.').first()).toBeVisible()
})

test('en privat hævning tælles ikke med i resultatet', async ({ page }) => {
  await page.goto('/bogforing')

  await page.getByLabel('Type').last().selectOption('haevning')
  await page.getByLabel('Dato').fill('2026-02-10')
  await page.getByLabel('Beløb (kr.)').fill('40000')
  await page.getByRole('button', { name: 'Registrér' }).click()

  await expect(page.getByText('Gemt')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Hævning (privat)' })).toBeVisible()
  await expect(page.getByText('40.000 kr.').first()).toBeVisible()
  await expect(page.getByText('Resultat').locator('xpath=following-sibling::p')).toHaveText('0 kr.')
})

test('depositum ind/ud tælles ikke med i resultatet eller driftsresultatet - det er gæld til lejeren', async ({
  page,
}) => {
  const thisYear = new Date().getFullYear()

  await page.goto('/bogforing')

  await page.getByLabel('Type').last().selectOption('indtaegt')
  await page.getByLabel('Kategori').last().selectOption('depositum')
  await page.getByLabel('Dato').fill(`${thisYear}-03-01`)
  await page.getByLabel('Beløb (kr.)').fill('24000')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.getByLabel('Type').last().selectOption('udgift')
  await page.getByLabel('Kategori').last().selectOption('depositum_tilbagebetaling')
  await page.getByLabel('Dato').fill(`${thisYear}-03-15`)
  await page.getByLabel('Beløb (kr.)').fill('24000')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await expect(page.getByText('Resultat').locator('xpath=following-sibling::p')).toHaveText('0 kr.')

  await page.goto('/rapporter')
  await expect(page.getByText('Årsrapport ' + thisYear)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Depositum', exact: true })).not.toBeVisible()
  await expect(
    page
      .getByRole('row', { name: /Driftsresultat \(fra resultatopgørelsen ovenfor\)/ })
      .locator('td')
      .last(),
  ).toHaveText('0 kr.')
})

test('kan udfylde VSO-stamdata og bruge hævningsberegneren', async ({ page }) => {
  await page.goto('/vso')

  await page.getByLabel('Kapitalafkastsats (%)').fill('2')
  await page.getByLabel('Indskudskonto (kr.)').fill('500000')
  await page.getByLabel('Opsparet overskud fra tidligere år, bruttobeløb (kr.)').fill('20000')
  await page.getByLabel('Banksaldo primo året (kr.)').fill('100000')
  await page.getByLabel('Skyldigt depositum primo året (kr.)').fill('24000')
  await page.getByLabel('Realkreditgæld primo året (kr.)').fill('500000')
  await page.getByLabel('Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)').fill('50000')
  await page.getByRole('button', { name: 'Gem VSO-stamdata' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()
  await expect(page.getByText('Kan hæves i')).toBeVisible()

  await page.getByLabel('Ønsket hævning (kr.)').fill('30000')
  await page.getByRole('button', { name: 'Beregn' }).click()

  await expect(page.getByText('1. Allerede beskattet beløb')).toBeVisible()
  await expect(page.getByText('5. Indskudskonto')).toBeVisible()
})

test('foreslår og gemmer næste års "hensat til senere hævning" ud fra dette års tal', async ({ page }) => {
  await page.goto('/vso')

  await page.getByLabel('År', { exact: true }).fill('2030')
  await page.getByLabel('Kapitalafkastsats (%)').fill('0')
  await page.getByLabel('Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)').fill('10000')
  await page.getByRole('button', { name: 'Gem VSO-stamdata' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await expect(page.getByText('Forslag til "Allerede beskattet beløb til rådighed" for 2031: 10.000 kr.')).toBeVisible()

  await page.getByRole('button', { name: "Brug 10.000 kr. som 2031's beløb" }).click()
  await expect(page.getByText('Gemt for 2031')).toBeVisible()

  await page.getByLabel('År', { exact: true }).fill('2031')
  await expect(page.getByLabel('Allerede beskattet beløb til rådighed, uden yderligere skat (kr.)')).toHaveValue(
    '10000',
  )
})

test('viser huslejestatus på dashboard når husleje er betalt', async ({ page }) => {
  const today = new Date()
  const iso = today.toISOString().slice(0, 10)
  const startOfMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`

  await page.goto('/stamdata')
  await page.getByLabel('Navn').fill('Jane Doe')
  await page.getByLabel('Lejemål start').fill(startOfMonth)
  await page.getByLabel('Månedlig husleje (kr.)').fill('8000')
  await page.getByRole('button', { name: 'Tilføj lejer' }).click()
  await expect(page.getByText('Jane Doe')).toBeVisible()

  await page.goto('/bogforing')
  await page.getByLabel('Dato').fill(iso)
  await page.getByLabel('Beløb (kr.)').fill('8000')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.goto('/')
  await expect(page.getByText('Betalt', { exact: false }).first()).toBeVisible()
})

test('kan eksportere en backup', async ({ page }) => {
  await page.goto('/stamdata')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Eksportér backup' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/^lejlighedsudlejning-backup-\d{4}-\d{2}-\d{2}\.json$/)
})

test('viser resultatopgørelse på rapport-siden ud fra bogførte posteringer', async ({ page }) => {
  const thisYear = new Date().getFullYear()

  await page.goto('/bogforing')
  await page.getByLabel('Dato').fill(`${thisYear}-03-01`)
  await page.getByLabel('Beløb (kr.)').fill('8000')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.goto('/rapporter')
  await expect(page.getByText('Årsrapport ' + thisYear)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Indtægter i alt' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Eksportér til PDF' })).toBeVisible()
})

test('renteindtægt holdes uden for driftsresultatet, og VSO-feltet for realkreditrenter/-bidrag indgår i årets overskud', async ({
  page,
}) => {
  const thisYear = new Date().getFullYear()

  await page.goto('/vso')
  await page.getByLabel('År', { exact: true }).fill(String(thisYear))
  await page.getByLabel('Realkreditrenter og -bidrag i alt (kr.)').fill('6000')
  await page.getByRole('button', { name: 'Gem VSO-stamdata' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.goto('/bogforing')

  await page.getByLabel('Type').last().selectOption('indtaegt')
  await page.getByLabel('Kategori').last().selectOption('renteindtaegt')
  await page.getByLabel('Dato').fill(`${thisYear}-04-01`)
  await page.getByLabel('Beløb (kr.)').fill('100')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()

  await page.goto('/rapporter')
  await page.getByLabel('År', { exact: true }).fill(String(thisYear))
  await expect(page.getByText('Årsrapport ' + thisYear)).toBeVisible()

  // Renteindtægten må ikke optræde i selve resultatopgørelsen (driftsresultatet, rubrik 111).
  await expect(page.getByRole('cell', { name: 'Renteindtægt', exact: true })).not.toBeVisible()

  // Men den vises særskilt i den skattemæssige opgørelse og indgår i årets overskud (rubrik 149) -
  // sammen med det indtastede VSO-felt for renter/bidrag (6.000 kr.).
  await expect(page.getByRole('cell', { name: '+ Renteindtægt i virksomhed' })).toBeVisible()
  const renteudgiftRaekke = page.getByRole('row', { name: /Renteudgift og -bidrag i virksomhed/ })
  await expect(renteudgiftRaekke).toBeVisible()
  await expect(renteudgiftRaekke.locator('td').last()).toHaveText(/6\.000/)
})

test('opretter automatisk husleje-skabelon og depositum-postering når en lejer tilføjes', async ({ page }) => {
  const today = new Date()
  const startOfYear = `${today.getFullYear()}-01-01`

  await page.goto('/stamdata')
  await page.getByLabel('Navn').fill('Jane Doe')
  await page.getByLabel('Lejemål start').fill(startOfYear)
  await page.getByLabel('Månedlig husleje (kr.)').fill('8000')
  await page.getByLabel('Depositum (kr.)').fill('24000')
  await page.getByRole('button', { name: 'Tilføj lejer' }).click()
  await expect(page.getByText('Jane Doe')).toBeVisible()

  await page.goto('/bogforing')
  await expect(page.getByText('manglende periode(r)')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Depositum', exact: true })).toBeVisible()

  await page.getByRole('button', { name: /Opret \d+ manglende/ }).click()
  await expect(page.getByText('Alle perioder er registreret.')).toBeVisible()
})

test('kan importere posteringer fra en CSV-fil fra netbanken', async ({ page }) => {
  await page.goto('/bogforing')

  const csv =
    'Dato;Kategori;Underkategori;Tekst;Beløb;Saldo;Status;Afstemt;\n' +
    '15.03.2026;Øvrige indtægter;Lejeindtægt;Testleje marts;16.500,00;100.000,00;Udført;Nej;\n'

  await page.setInputFiles('input[type="file"]', {
    name: 'test-posteringer.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  })

  await expect(page.getByText('test-posteringer.csv')).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Testleje marts' })).toBeVisible()

  await page.getByRole('button', { name: /Importér \d+ postering/ }).click()
  await expect(page.getByText(/postering\(er\) importeret/)).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Testleje marts' })).toBeVisible()
})

test('gætter type/kategori korrekt ud fra CSV-indholdet', async ({ page }) => {
  await page.goto('/bogforing')

  const csv =
    'Dato;Kategori;Underkategori;Tekst;Beløb;Saldo;Status;Afstemt;\n' +
    '02.01.2026;Bolig;Fællesudgifter;E/F Test;-2.290,00;100.000,00;Udført;Nej;\n' +
    '15.01.2026;Bolig;Realkreditlån;Realkredit Danmark;-7.828,00;97.710,00;Udført;Nej;\n' +
    '20.01.2026;Øvrige udgifter;Overførsler;Donor;-40.000,00;57.710,00;Udført;Nej;privat brug\n'

  await page.setInputFiles('input[type="file"]', {
    name: 'kategori-test.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(csv, 'utf-8'),
  })

  const raekker = page.locator('tbody tr')
  await expect(raekker).toHaveCount(3)

  await expect(raekker.nth(0).locator('select').first()).toHaveValue('udgift')
  await expect(raekker.nth(0).locator('select').nth(1)).toHaveValue('ejerforening')

  await expect(raekker.nth(1).locator('select').nth(1)).toHaveValue('anden_udgift')
  await expect(raekker.nth(1).getByText(/blander renter, bidrag og afdrag/)).toBeVisible()

  await expect(raekker.nth(2).locator('select').first()).toHaveValue('haevning')

  // Realkredit-linjen er fravalgt som standard (pga. advarslen), de andre er stadig afkrydset
  await expect(raekker.nth(0).locator('input[type="checkbox"]')).toBeChecked()
  await expect(raekker.nth(1).locator('input[type="checkbox"]')).not.toBeChecked()
  await expect(raekker.nth(2).locator('input[type="checkbox"]')).toBeChecked()

  // Beløbet kan rettes direkte i forhåndsvisningen, fx til kun rentedelen af ydelsen
  const beloebsfelt = raekker.nth(1).locator('input[type="number"]')
  await beloebsfelt.fill('-527')
  await expect(beloebsfelt).toHaveValue('-527')
})
