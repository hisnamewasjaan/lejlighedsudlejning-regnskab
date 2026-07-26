import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
