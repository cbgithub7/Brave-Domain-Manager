import { expect, test } from './fixtures'

test.describe('app launch', () => {
  test('renders the titlebar and default tab', async ({ page }) => {
    await expect(page.locator('text=Brave Domain Manager')).toBeVisible()
    await expect(page.locator('h1')).toHaveText('Blocked Domains')
  })

  test('titlebar maximize/restore round-trips through IPC', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Maximize', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Maximize', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()
    await page.getByRole('button', { name: 'Restore', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Maximize', exact: true })).toBeVisible()
  })
})

test.describe('domain management (fake registry, no UAC)', () => {
  test('add, undo, and redo a domain round-trip correctly', async ({ page }) => {
    await expect(page.locator('text=No domains are currently blocked.')).toBeVisible()

    await page.getByPlaceholder('example.com').fill('e2e-test-domain.example')
    await page.getByRole('button', { name: 'Add domain' }).click()
    await expect(page.locator('label', { hasText: 'e2e-test-domain.example' })).toBeVisible()

    await page.getByRole('button', { name: /^. Undo/ }).click()
    await expect(page.locator('text=No domains are currently blocked.')).toBeVisible()

    await page.getByRole('button', { name: /^. Redo/ }).click()
    await expect(page.locator('label', { hasText: 'e2e-test-domain.example' })).toBeVisible()
  })

  test('remove a domain via its row button', async ({ page }) => {
    await page.getByPlaceholder('example.com').fill('e2e-remove-test.example')
    await page.getByRole('button', { name: 'Add domain' }).click()
    await expect(page.locator('label', { hasText: 'e2e-remove-test.example' })).toBeVisible()

    // The button's accessible name is its text content ("Remove"); the
    // per-domain detail lives in its title tooltip, not the accessible name -
    // scope to the row to disambiguate rather than matching on name.
    const row = page.locator('li', { hasText: 'e2e-remove-test.example' })
    await row.getByRole('button', { name: 'Remove' }).click()
    await expect(page.locator('text=No domains are currently blocked.')).toBeVisible()
  })

  test('rejects an invalid domain with a visible error, does not crash', async ({ page }) => {
    await page.getByPlaceholder('example.com').fill('not a valid domain')
    await page.getByRole('button', { name: 'Add domain' }).click()
    await expect(page.locator('text=/not a valid domain/')).toBeVisible()
    // App must still be responsive afterward - the old app used to crash here.
    await expect(page.locator('h1')).toHaveText('Blocked Domains')
  })
})

test.describe('theme toggle', () => {
  test('switching to dark sets data-theme on the root element', async ({ page }) => {
    await page.getByRole('button', { name: 'Settings' }).click()
    // A controlled radio bound to an async settings.set() IPC round trip
    // doesn't flip its checked state synchronously with the click the way a
    // plain native radio does, so .click() + a polling expect() (rather than
    // .check(), which demands an immediate state change) is the correct tool.
    await page.locator('input[name="theme"]').nth(2).click() // system, light, dark
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})
