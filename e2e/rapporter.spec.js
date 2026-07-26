import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
