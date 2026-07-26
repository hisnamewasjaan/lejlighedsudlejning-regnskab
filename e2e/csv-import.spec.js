import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
