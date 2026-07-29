import { join } from 'node:path'
import { test as base } from '@playwright/test'
import { _electron } from 'playwright-core'
import type { ElectronApplication, Page } from 'playwright-core'

const REPO_ROOT = join(__dirname, '..', '..')

interface ElectronFixtures {
  electronApp: ElectronApplication
  page: Page
}

/**
 * Launches the built app with NODE_ENV=test, which swaps in a FakeRegistryClient
 * and a no-op elevation runner (see src/main/index.ts) - every add/remove/undo/
 * redo round-trips through the real IPC/preload/renderer stack without touching
 * the real Windows registry or ever needing a UAC prompt.
 */
export const test = base.extend<ElectronFixtures>({
  // eslint-disable-next-line no-empty-pattern
  electronApp: async ({}, use) => {
    const electronBinary = join(REPO_ROOT, 'node_modules', 'electron', 'dist', 'electron.exe')
    const app = await _electron.launch({
      executablePath: electronBinary,
      args: [REPO_ROOT],
      env: { ...process.env, NODE_ENV: 'test' },
      timeout: 30_000
    })
    await use(app)
    await app.close()
  },
  page: async ({ electronApp }, use) => {
    const page = await electronApp.firstWindow()
    await page.waitForLoadState('load')
    await use(page)
  }
})

export { expect } from '@playwright/test'
