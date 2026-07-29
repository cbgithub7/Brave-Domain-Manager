import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SettingsStore } from '../../src/main/services/settingsStore'
import { DEFAULT_SETTINGS } from '../../src/shared/settings-types'

describe('SettingsStore', () => {
  let dir: string
  let filePath: string

  beforeEach(async () => {
    dir = await mkdtemp(join(tmpdir(), 'bdm-settings-test-'))
    filePath = join(dir, 'settings.json')
  })

  afterEach(async () => {
    await rm(dir, { recursive: true, force: true })
  })

  it('returns defaults before load() when no file exists', () => {
    const store = new SettingsStore(filePath)
    expect(store.get()).toEqual(DEFAULT_SETTINGS)
  })

  it('load() falls back to defaults when the file does not exist', async () => {
    const store = new SettingsStore(filePath)
    const loaded = await store.load()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })

  it('set() persists to disk and a fresh store loads the same values', async () => {
    const store = new SettingsStore(filePath)
    await store.set({ theme: 'dark', fontScale: 1.2 })

    const raw = JSON.parse(await readFile(filePath, 'utf-8'))
    expect(raw.theme).toBe('dark')
    expect(raw.fontScale).toBe(1.2)

    const freshStore = new SettingsStore(filePath)
    const loaded = await freshStore.load()
    expect(loaded.theme).toBe('dark')
    expect(loaded.fontScale).toBe(1.2)
  })

  it('set() merges the logging sub-object rather than replacing it wholesale', async () => {
    const store = new SettingsStore(filePath)
    await store.set({ logging: { enabled: true, enabledCategories: ['audit'] } })
    await store.set({ theme: 'light' }) // unrelated change

    expect(store.get().logging).toEqual({ enabled: true, enabledCategories: ['audit'] })
  })

  it('falls back to defaults if the settings file on disk is corrupt', async () => {
    const fs = await import('node:fs/promises')
    await fs.writeFile(filePath, 'not valid json{{{')

    const store = new SettingsStore(filePath)
    const loaded = await store.load()
    expect(loaded).toEqual(DEFAULT_SETTINGS)
  })
})
