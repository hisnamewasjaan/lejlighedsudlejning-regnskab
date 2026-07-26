import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
