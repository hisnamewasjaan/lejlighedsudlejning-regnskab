import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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

test('kan eksportere en backup', async ({ page }) => {
  await page.goto('/stamdata')

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Eksportér backup' }).click(),
  ])

  expect(download.suggestedFilename()).toMatch(/^lejlighedsudlejning-backup-\d{4}-\d{2}-\d{2}\.json$/)
})
