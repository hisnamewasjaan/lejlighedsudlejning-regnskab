import { expect, test } from '@playwright/test'

test('kan oprette og skifte mellem flere ejendomme, uden at data blandes sammen', async ({ page }) => {
  // Opret ejendom A og bogfør en indtægt på den
  await page.goto('/stamdata')
  await page.getByRole('button', { name: '+ Opret ny ejendom' }).click()
  await page.getByLabel('Adresse på ny ejendom').fill('Ejendom A')
  await page.getByRole('button', { name: 'Opret ejendom' }).click()
  await expect(page.getByRole('heading', { name: 'Lejlighedsoplysninger' })).toBeVisible()

  await page.goto('/bogforing')
  await page.getByLabel('Dato').fill('2026-01-05')
  await page.getByLabel('Beløb (kr.)').fill('11111')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()
  await expect(page.getByText('11.111 kr.').first()).toBeVisible()

  // Opret ejendom B og bogfør en anden indtægt på den
  await page.goto('/stamdata')
  await page.getByRole('button', { name: '+ Opret ny ejendom' }).click()
  await page.getByLabel('Adresse på ny ejendom').fill('Ejendom B')
  await page.getByRole('button', { name: 'Opret ejendom' }).click()
  // Vent til den NYE ejendom faktisk er den valgte (Lejlighedsoplysninger var allerede synlig fra
  // ejendom A, så "toBeVisible" alene venter ikke på den reaktive omvalg-opdatering).
  await expect(page.getByLabel('Adresse', { exact: true })).toHaveValue('Ejendom B')

  await page.goto('/bogforing')
  // Ejendom B bør IKKE se ejendom A's postering
  await expect(page.getByText('11.111 kr.')).not.toBeVisible()

  await page.getByLabel('Dato').fill('2026-01-06')
  await page.getByLabel('Beløb (kr.)').fill('22222')
  await page.getByRole('button', { name: 'Registrér' }).click()
  await expect(page.getByText('Gemt')).toBeVisible()
  await expect(page.getByText('22.222 kr.').first()).toBeVisible()
  await expect(page.getByText('11.111 kr.')).not.toBeVisible()

  // Skift tilbage til ejendom A via nav-dropdown - kun A's postering skal være synlig
  await page.getByLabel('Valgt ejendom').selectOption({ label: 'Ejendom A' })
  await expect(page.getByText('11.111 kr.').first()).toBeVisible()
  await expect(page.getByText('22.222 kr.')).not.toBeVisible()
})
