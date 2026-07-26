import { expect } from '@playwright/test'

export async function opretTestEjendom(page) {
  await page.goto('/stamdata')
  await page.getByRole('button', { name: '+ Opret ny ejendom' }).click()
  await page.getByLabel('Adresse på ny ejendom').fill('Testvej 1, 2100 København Ø')
  await page.getByRole('button', { name: 'Opret ejendom' }).click()
  await expect(page.getByRole('heading', { name: 'Lejlighedsoplysninger' })).toBeVisible()
}
