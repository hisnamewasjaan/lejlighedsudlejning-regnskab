import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
