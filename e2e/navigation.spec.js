import { expect, test } from '@playwright/test'
import { opretTestEjendom } from './helpers.js'

test.beforeEach(async ({ page }) => {
  await opretTestEjendom(page)
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
